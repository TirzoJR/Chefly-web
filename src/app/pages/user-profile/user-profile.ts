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
  getDocs,
  arrayUnion,
  arrayRemove,
  documentId,
  getCountFromServer
} from '@angular/fire/firestore';
import { Observable, switchMap, of, forkJoin, Subscription, tap } from 'rxjs'; // 👈 Agregamos 'tap'
import { User } from '@angular/fire/auth';
import Swal from 'sweetalert2';

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
  activeTab: 'info' | 'recipes' | 'favorites' | 'settings' | 'network' = 'info'; // 👈 Agregamos 'network' si quieres una pestaña de seguidores
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

  // 👈 NUEVO: Estadísticas Globales
  totalViews: number = 0;
  totalLikes: number = 0;

  // Observables
  user$ = this.authService.user$;

  // 1. Datos del usuario en tiempo real (Perfil, Bio, Listas)
  userData$: Observable<any> = this.user$.pipe(
    switchMap(user => {
      if (!user) return of(null);
      return docData(doc(this.firestore, `users/${user.uid}`));
    })
  );

  // 2. Mis Recetas + Cálculo de Estadísticas 👈 ACTUALIZADO
  myRecipes$: Observable<any[]> = this.user$.pipe(
    switchMap(user => {
      if (!user) return of([]);
      const q = query(collection(this.firestore, 'recipes'), where('uid', '==', user.uid));
      return collectionData(q, { idField: 'id' });
    }),
    tap(recipes => {
      // Cada vez que cargan tus recetas, sumamos automáticamente todas las vistas y likes
      this.totalViews = recipes.reduce((sum, r) => sum + (r.views || 0), 0);
      this.totalLikes = recipes.reduce((sum, r) => sum + (r.ratingCount || r.rating || 0), 0);
    })
  );

  // 3. Mis Favoritos
  favoriteRecipes$: Observable<any[]> = this.userData$.pipe(
    switchMap(data => {
      const favIds = data?.favorites || [];
      if (favIds.length === 0) return of([]);

      const limitedIds = favIds.slice(0, 30);
      const q = query(
        collection(this.firestore, 'recipes'),
        where(documentId(), 'in', limitedIds)
      );
      return collectionData(q, { idField: 'id' });
    })
  );

  // 4. 👈 NUEVO: Obtener los perfiles de mis SEGUIDORES (Para pintarlos en HTML)
  followersUsers$: Observable<any[]> = this.userData$.pipe(
    switchMap(data => {
      const followerIds = data?.followers || [];
      if (followerIds.length === 0) return of([]);
      // Buscamos a los usuarios cuyo ID esté en tu lista de seguidores
      const q = query(collection(this.firestore, 'users'), where(documentId(), 'in', followerIds.slice(0, 30)));
      return collectionData(q, { idField: 'uid' });
    })
  );

  // 5. 👈 NUEVO: Obtener los perfiles de los que ESTOY SIGUIENDO (Para pintarlos en HTML)
  followingUsers$: Observable<any[]> = this.userData$.pipe(
    switchMap(data => {
      const followingIds = data?.following || [];
      if (followingIds.length === 0) return of([]);
      // Buscamos a los usuarios cuyo ID esté en tu lista de seguidos
      const q = query(collection(this.firestore, 'users'), where(documentId(), 'in', followingIds.slice(0, 30)));
      return collectionData(q, { idField: 'uid' });
    })
  );

  ngOnInit() {
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.fontSize = (localStorage.getItem('fontSize') as any) || 'medium';
    this.applyTheme();

    this.userSub = this.authService.user$.subscribe(async (user) => {
      if (user) {
        this.userData$.subscribe(data => {
            this.currentUserData = data;
            if (data?.bio) this.bioText = data.bio;

            this.favoritesCount = data?.favorites?.length || 0;
            this.followersCount = data?.followers?.length || 0;
            this.followingCount = data?.following?.length || 0;
        });

        const recipesRef = collection(this.firestore, 'recipes');
        const q = query(recipesRef, where('uid', '==', user.uid));
        try {
          const snapshot = await getCountFromServer(q);
          this.recipesCount = snapshot.data().count;
        } catch (error) {
          console.error("Error contando recetas:", error);
        }

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
    if (diff.includes('fácil') || diff.includes('facil')) return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
    if (diff.includes('intermedio') || diff.includes('media') || diff.includes('normal')) return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (diff.includes('difícil') || diff.includes('dificil')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
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

  toggleEditBio() { this.isEditingBio = !this.isEditingBio; }

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
