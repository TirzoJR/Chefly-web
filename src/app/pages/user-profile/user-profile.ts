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
  documentId 
} from '@angular/fire/firestore';
import { Observable, of, switchMap, Subscription } from 'rxjs';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-profile.html'
})
export class UserProfileComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private firestore = inject(Firestore);

  activeTab: 'info' | 'recipes' | 'favorites' | 'settings' = 'info';
  isDarkMode = false;
  fontSize: 'small' | 'medium' | 'large' = 'medium';
  isEditingBio: boolean = false;
  bioText: string = '';
  private userSub?: Subscription;

  user$ = this.authService.user$; 

  userData$: Observable<any> = this.user$.pipe(
    switchMap(user => {
      if (!user) return of(null);
      return docData(doc(this.firestore, `users/${user.uid}`));
    })
  );

  // MIS RECETAS REALES: Basado en tu authorId
  myRecipes$: Observable<any[]> = this.user$.pipe(
    switchMap(user => {
      if (!user) return of([]);
      const q = query(collection(this.firestore, 'recipes'), where('authorId', '==', user.uid));
      return collectionData(q, { idField: 'id' });
    })
  );

  // FAVORITOS REALES: Usamos documentId() para buscar por el array de IDs
  favoriteRecipes$: Observable<any[]> = this.userData$.pipe(
    switchMap(data => {
      const favIds = data?.favorites || [];
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
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.fontSize = (localStorage.getItem('fontSize') as any) || 'medium';
    this.applyTheme();

    this.userSub = this.userData$.subscribe(data => {
      if (data?.bio) this.bioText = data.bio;
    });
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  // --- LÓGICA DE ESTILO DE RECETAS (Igual que en Home) ---
  getDifficultyStyle(difficulty: string | undefined | null): string {
  if (!difficulty) return 'bg-gray-100 text-gray-800 border-gray-200';
  
  const diff = difficulty.toLowerCase().trim();
  
  // Colores de dificultad para que se pinten correctamente
  if (diff.includes('fácil') || diff.includes('facil')) {
    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
  }
  if (diff.includes('intermedio') || diff.includes('normal')) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
  if (diff.includes('difícil') || diff.includes('dificil')) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
  }
  
  return 'bg-gray-100 text-gray-800 border-gray-200';
}
  // --- MÉTODOS DE AJUSTES ---
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

 getFirstName(displayName: string | null | undefined): string {
  // Si no hay nombre, devolvemos un fallback seguro
  if (!displayName) return 'Chef';
  return displayName.trim().split(' ')[0];
}

getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  try {
    return name
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  } catch {
    return 'U';
  }
}
}