import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
// 1. Importamos herramientas de Firestore
import { Firestore, collection, query, where, collectionData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { UserProfile } from '../../models/user.model';
import { Recipe } from '../../models/recipe.model'; // Asegúrate de importar el modelo Recipe

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-profile.html'
})
export class UserProfileComponent {
  
  private firestore = inject(Firestore); // Inyectamos Firestore

  activeTab: 'info' | 'recipes' | 'favorites' | 'settings' = 'info';
  isFollowing: boolean = false;

  // ID del usuario actual (Simulado por ahora, luego vendrá del Auth)
  currentUserId = 'user-123'; 

  // Datos del Perfil (Esto sigue simulado hasta que tengas la colección 'users')
  user$: Observable<UserProfile> = of({
    uid: this.currentUserId,
    displayName: 'María García',
    email: 'maria.garcia@email.com',
    photoURL: '', 
    bio: '🌮 Cocinera mexicana de corazón. ¡La cocina es amor hecho comida!',
    role: 'admin',
    level: 'Experto',
    memberSince: new Date('2024-03-14'),
    stats: {
      recipesCount: 12, followersCount: 142, followingCount: 45, favoritesCount: 34, likesReceived: 567
    },
    badges: ['chef-estrella', 'top-contributor'],
    settings: { darkMode: false, fontSize: 'medium', notifications: true }
  });

  // 2. Variable para las Recetas REALES (Observable)
  myRecipes$: Observable<Recipe[]>;
  
  // Variable para Favoritos REALES (Observable)
  myFavorites$: Observable<Recipe[]>;

  constructor() {
    // --- CONSULTA REAL A FIREBASE: MIS RECETAS ---
    // Buscamos en la colección 'recipes' donde 'authorId' sea igual a mi usuario
    const recipesRef = collection(this.firestore, 'recipes');
    
    // Query para "Mis Recetas"
    const myRecipesQuery = query(recipesRef, where('authorId', '==', this.currentUserId));
    this.myRecipes$ = collectionData(myRecipesQuery, { idField: 'id' }) as Observable<Recipe[]>;

    // --- CONSULTA REAL: FAVORITOS ---
    // (Nota: Esto requiere que tengas un campo o colección de favoritos. 
    // Por ahora, traeremos las recetas donde el rating sea 5 como ejemplo de "favoritos reales")
    const favoritesQuery = query(recipesRef, where('rating', '>=', 4.5));
    this.myFavorites$ = collectionData(favoritesQuery, { idField: 'id' }) as Observable<Recipe[]>;
  }

  setActiveTab(tab: any) {
    this.activeTab = tab;
  }

  toggleFollow() {
    this.isFollowing = !this.isFollowing;
  }

  logout() {
    if(confirm('¿Estás seguro de cerrar sesión?')) console.log('Cerrando...');
  }

  // Helpers visuales
  getInitials(name: string): string {
    return name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '';
  }

  getBadgeIcon(badge: string): string {
    const icons: any = { 'chef-estrella': '⭐', 'top-contributor': '🏆', 'foodie': '🍔' };
    return icons[badge] || '🎖️';
  }

  getBadgeLabel(badge: string): string {
    return badge.replace('-', ' ').toUpperCase();
  }
}