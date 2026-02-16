import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  query, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  increment, 
  arrayUnion 
} from '@angular/fire/firestore';
import { AsyncPipe, NgFor, NgIf, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { Recipe } from '../../models/recipe.model';
import { register } from 'swiper/element/bundle';
import { AuthService } from '../../services/auth';
import { User } from '@angular/fire/auth';

register();

@Component({
  selector: 'app-home',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [AsyncPipe, NgFor, NgIf, RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent {
  private authService = inject(AuthService);
  private firestore = inject(Firestore);

  user$: Observable<User | null> = this.authService.user$;
  featuredRecipes$: Observable<Recipe[]>;
  recipes$: Observable<Recipe[]>;
  tip$: Observable<any>;
  titles$: Observable<string[]>;

  currentUserData: any = null; // Aquí guardamos tu nombre real de Firestore

  categoryStyles: { [key: string]: string } = {
    'tecnica': 'bg-blue-50 border-blue-100 text-blue-800',
    'coccion': 'bg-orange-50 border-orange-100 text-orange-800',
    'sazon': 'bg-green-50 border-green-100 text-green-800',
    'seguridad': 'bg-red-50 border-red-100 text-red-800',
    'general': 'bg-gray-50 border-gray-100 text-gray-800'
  };

  constructor() {
    const recipesCol = collection(this.firestore, 'recipes');

    // Escuchamos al usuario y cargamos sus datos de Firestore
    this.authService.user$.subscribe(user => {
      if (user) {
        this.authService.getUserData(user.uid).subscribe((data: any) => {
          this.currentUserData = data;
        });
      }
    });

    const featuredQuery = query(recipesCol, orderBy('views', 'desc'), limit(4));
    this.featuredRecipes$ = collectionData(featuredQuery, { idField: 'id' }) as Observable<Recipe[]>;
    this.recipes$ = collectionData(query(recipesCol), { idField: 'id' }) as Observable<Recipe[]>;

    const tipsCol = collection(this.firestore, 'tips');
    this.tip$ = collectionData(tipsCol, { idField: 'id' }).pipe(
      map(tips => {
        if (!tips || tips.length === 0) return null;
        const startDate = new Date('2026-01-01').getTime();
        const today = new Date().getTime();
        const diffInDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        return tips[diffInDays % tips.length];
      })
    );

    this.titles$ = this.featuredRecipes$.pipe(map(recipes => recipes.map(r => r.title)));
  }

  getTipStyle(category: string): string {
    return this.categoryStyles[category?.toLowerCase()] || this.categoryStyles['general'];
  }

  getDifficultyStyle(difficulty: string | undefined | null): string {
    if (!difficulty) return 'bg-gray-100 text-gray-800 border-gray-200';
    const diff = difficulty.toLowerCase();
    if (diff.includes('fácil') || diff.includes('facil')) return 'bg-green-100 text-green-800 border-green-200';
    if (diff.includes('intermedio') || diff.includes('media')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (diff.includes('difícil') || diff.includes('dificil')) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getSavedReaction(tipId: string): string | null {
    const reactedTips = JSON.parse(localStorage.getItem('reactedTips') || '{}');
    return reactedTips[tipId] || null;
  }

  async addComment(tipId: string, commentInput: HTMLInputElement) {
    const text = commentInput.value.trim();
    const user = this.authService.getCurrentUser();

    if (!text || !tipId || !user) return;

    // LÓGICA DE NOMBRE REAL: Prioridad Firestore > Google > Email
    const finalName = this.currentUserData?.displayName || user.displayName || user.email?.split('@')[0] || 'Cocinero';
    const finalPhoto = this.currentUserData?.photoURL || user.photoURL || 'assets/default-avatar.png';

    const tipRef = doc(this.firestore, 'tips', tipId);
    try {
      await updateDoc(tipRef, {
        comments: arrayUnion({
          uid: user.uid,
          userName: finalName, 
          photoURL: finalPhoto,
          text: text,
          date: new Date().toISOString()
        })
      });
      commentInput.value = ''; 
    } catch (error) {
      console.error("Error al comentar:", error);
    }
  }

  async reactToTip(tipId: string, type: 'love' | 'like' | 'wow') {
    const reactedTips = JSON.parse(localStorage.getItem('reactedTips') || '{}');
    if (!tipId || reactedTips[tipId]) return;

    const tipRef = doc(this.firestore, 'tips', tipId);
    try {
      await updateDoc(tipRef, { [`reactions.${type}`]: increment(1) });
      reactedTips[tipId] = type; 
      localStorage.setItem('reactedTips', JSON.stringify(reactedTips));
    } catch (error) {
      console.error("Error al reaccionar:", error);
    }
  }

  async trackView(recipeId: string | undefined) {
    if (!recipeId) return;
    const recipeRef = doc(this.firestore, 'recipes', recipeId);
    try {
      await updateDoc(recipeRef, { views: increment(1) });
    } catch (error) {
      console.error("Error al actualizar vistas:", error);
    }
  }

  login() { this.authService.loginWithGoogle(); }

  logout() {
    if (window.confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      this.authService.logout();
    }
  }
}