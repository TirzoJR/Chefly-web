import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Firestore, collection, query, where, collectionData, doc, updateDoc, docData } from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-profile.html'
})
export class UserProfileComponent implements OnInit {
  public authService = inject(AuthService);
  private firestore = inject(Firestore);

  activeTab: 'info' | 'recipes' | 'favorites' | 'settings' = 'info';
  isDarkMode = false;
  fontSize: 'small' | 'medium' | 'large' = 'medium';
  isEditingBio: boolean = false;
  bioText: string = '';
  readonly BIO_LIMIT = 1000;

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

  // FAVORITOS REALES: Basado en el campo 'favorites' de tu perfil
  favoriteRecipes$: Observable<any[]> = this.userData$.pipe(
    switchMap(data => {
      const favIds = data?.favorites || [];
      if (favIds.length === 0) return of([]);
      const q = query(collection(this.firestore, 'recipes'), where('id', 'in', favIds));
      return collectionData(q, { idField: 'id' });
    })
  );

  ngOnInit() {
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.fontSize = (localStorage.getItem('fontSize') as any) || 'medium';
    this.applyTheme();

    this.userData$.subscribe(data => {
      if (data?.bio) this.bioText = data.bio;
    });
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    const root = document.documentElement;
    if (this.isDarkMode) {
      root.classList.add('dark');
      document.body.style.backgroundColor = 'oklch(0.145 0 0)';
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

  getInitials(name: string | null): string {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
  }
}