import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { 
  Firestore, 
  collection, 
  query, 
  where, 
  collectionData, 
  doc, 
  updateDoc, 
  docData,
  documentId,
  getCountFromServer // <--- IMPORTANTE: Faltaba esta importación
} from '@angular/fire/firestore';
import { Observable, of, switchMap, Subscription } from 'rxjs';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-profile.html'
})
export class UserProfileComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private firestore = inject(Firestore);

  // Variables de UI
  activeTab: 'info' | 'recipes' | 'favorites' | 'settings' = 'info';
  isDarkMode = false;
  fontSize: 'small' | 'medium' | 'large' = 'medium';
  isEditingBio: boolean = false;
  bioText: string = '';
  
  // Variables de Datos
  currentUserData: any = null;
  private userSub?: Subscription;

  // Contadores Reales
  recipesCount: number = 0;      
  followersCount: number = 0;    
  followingCount: number = 0;    
  favoritesCount: number = 0;    
  tipReactionsCount: number = 0; 

  // Observables
  user$ = this.authService.user$; 

  // 1. Datos del usuario en tiempo real (Perfil, Bio, Listas)
  userData$: Observable<any> = this.user$.pipe(
    switchMap(user => {
      if (!user) return of(null);
      return docData(doc(this.firestore, `users/${user.uid}`));
    })
  );

  // 2. Mis Recetas (Para mostrar en la pestaña "Mis Recetas")
  myRecipes$: Observable<any[]> = this.user$.pipe(
    switchMap(user => {
      if (!user) return of([]);
      // Nota: Usamos 'uid' porque así lo guardamos en el home.ts anteriormente
      const q = query(collection(this.firestore, 'recipes'), where('uid', '==', user.uid));
      return collectionData(q, { idField: 'id' });
    })
  );

  // 3. Mis Favoritos (Recupera las recetas completas basadas en los IDs guardados)
  favoriteRecipes$: Observable<any[]> = this.userData$.pipe(
    switchMap(data => {
      const favIds = data?.favorites || [];
      // BLINDAJE: Si no hay favoritos, devolvemos array vacío para evitar error de Firestore
      if (favIds.length === 0) return of([]);

      // Firestore limita las consultas 'in' a un máximo de 30 IDs
      const limitedIds = favIds.slice(0, 30);
      const q = query(
        collection(this.firestore, 'recipes'), 
        where(documentId(), 'in', limitedIds)
      );
      return collectionData(q, { idField: 'id' });
    })
  );

  ngOnInit() {
    // 1. Cargar preferencias visuales
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.fontSize = (localStorage.getItem('fontSize') as any) || 'medium';
    this.applyTheme();

    // 2. Suscribirse al usuario para cargar datos y contadores
    this.userSub = this.authService.user$.subscribe(async (user) => {
      if (user) {
        
        // A. Suscripción a datos de perfil (Tiempo real)
        // Esto actualiza seguidores, seguidos y bio automáticamente
        this.userData$.subscribe(data => {
            this.currentUserData = data;
            if (data?.bio) this.bioText = data.bio;

            // Actualizar contadores de arrays
            this.favoritesCount = data?.favorites?.length || 0;
            this.followersCount = data?.followers?.length || 0;
            this.followingCount = data?.following?.length || 0;
        });

        // B. Contar Recetas Publicadas (Consulta única optimizada)
        const recipesRef = collection(this.firestore, 'recipes');
        const q = query(recipesRef, where('uid', '==', user.uid));
        
        try {
          const snapshot = await getCountFromServer(q);
          this.recipesCount = snapshot.data().count;
        } catch (error) {
          console.error("Error contando recetas:", error);
        }

        // C. Contar Likes dados a Tips (LocalStorage)
        const localReactions = JSON.parse(localStorage.getItem('reactedTips') || '{}');
        this.tipReactionsCount = Object.keys(localReactions).length;
      }
    });
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  // --- MÉTODOS DE ESTILO ---
  getDifficultyStyle(difficulty: string | undefined | null): string {
    if (!difficulty) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const diff = difficulty.toLowerCase().trim();
    
    if (diff.includes('fácil') || diff.includes('facil')) {
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
    }
    if (diff.includes('intermedio') || diff.includes('media') || diff.includes('normal')) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    if (diff.includes('difícil') || diff.includes('dificil')) {
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
    }
    
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }

  // --- AJUSTES Y PREFERENCIAS ---
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    const root = document.documentElement;
    if (this.isDarkMode) {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#0F172A'; 
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#F8FAFC';
    }
  }

  setFontSize(size: 'small' | 'medium' | 'large') {
    this.fontSize = size;
    localStorage.setItem('fontSize', size);
  }

  // --- EDICIÓN DE PERFIL ---
  toggleEditBio() {
    this.isEditingBio = !this.isEditingBio;
  }

  async saveBio(uid: string) {
    try {
      await updateDoc(doc(this.firestore, `users/${uid}`), { bio: this.bioText });
      this.isEditingBio = false;
    } catch (error) {
      console.error("Error al guardar la bio:", error);
    }
  }

  logout() {
    if (confirm('¿Estás seguro de cerrar sesión?')) this.authService.logout();
  }

  // --- HELPERS VISUALES ---
  getFirstName(displayName: string | null | undefined): string {
    if (!displayName) return 'Chef';
    return displayName.trim().split(' ')[0];
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return 'U';
    try {
      return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    } catch {
      return 'U';
    }
  }
}