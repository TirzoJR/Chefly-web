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
import { Observable, map, BehaviorSubject, combineLatest } from 'rxjs';
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
  public authService = inject(AuthService);
  private firestore = inject(Firestore);

  // Observables para el HTML
  user$: Observable<User | null> = this.authService.user$;
  featuredRecipes$: Observable<Recipe[]>;
  tip$: Observable<any>;
  titles$: Observable<string[]>;

  // Lógica de Buscador y Filtros
  private allRecipes$: Observable<Recipe[]>;
  searchTerm$ = new BehaviorSubject<string>('');
  categoryFilter$ = new BehaviorSubject<string>('');

  filteredRecipes$: Observable<Recipe[]>;
  searchResults$: Observable<Recipe[]>;
  recipes$: Observable<Recipe[]>;

  currentUserData: any = null;

  categoryStyles: { [key: string]: string } = {
    'tecnica': 'bg-blue-50 border-blue-100 text-blue-800',
    'coccion': 'bg-orange-50 border-orange-100 text-orange-800',
    'sazon': 'bg-green-50 border-green-100 text-green-800',
    'seguridad': 'bg-red-50 border-red-100 text-red-800',
    'general': 'bg-gray-50 border-gray-100 text-gray-800'
  };

  foodAvatars: string[] = [
    'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
    'https://cdn-icons-png.flaticon.com/512/1404/1404945.png',
    'https://cdn-icons-png.flaticon.com/512/4727/4727450.png',
    'https://cdn-icons-png.flaticon.com/512/2515/2515228.png',
    'https://cdn-icons-png.flaticon.com/512/3143/3143643.png'
  ];

  constructor() {
    const recipesCol = collection(this.firestore, 'recipes');

    // Suscripción a datos de usuario
    this.authService.user$.subscribe(user => {
      if (user) {
        this.authService.getUserData(user.uid).subscribe((data: any) => {
          this.currentUserData = data;
        });
      }
    });

    // --- FIX: Uso de query() para evitar error de tipo en Firebase 11 ---

    // 1. Recetas Destacadas
    const featuredQuery = query(recipesCol, orderBy('views', 'desc'), limit(4));
    this.featuredRecipes$ = collectionData(featuredQuery, { idField: 'id' }) as Observable<Recipe[]>;

    // 2. Todas las Recetas (Base para filtros)
    const allQuery = query(recipesCol);
    this.allRecipes$ = collectionData(allQuery, { idField: 'id' }) as Observable<Recipe[]>;

    // 3. Lógica de filtrado por categoría
    this.filteredRecipes$ = combineLatest([this.allRecipes$, this.categoryFilter$]).pipe(
      map(([recipes, category]) => {
        if (!category) return recipes;
        return recipes.filter(r => r.category === category);
      })
    );

    // Mantenemos recipes$ sincronizado con el grid
    this.recipes$ = this.filteredRecipes$;

    // 4. Lógica de buscador (Dropdown)
    this.searchResults$ = combineLatest([this.allRecipes$, this.searchTerm$]).pipe(
      map(([recipes, term]) => {
        const cleanTerm = term.toLowerCase().trim();
        if (!cleanTerm) return [];
        return recipes.filter(r =>
          r.title.toLowerCase().includes(cleanTerm) ||
          r.category?.toLowerCase().includes(cleanTerm)
        ).slice(0, 5);
      })
    );

    // 5. Tip del Día (Corregido con query)
    const tipsCol = collection(this.firestore, 'tips');
    const tipsQuery = query(tipsCol);
    this.tip$ = collectionData(tipsQuery, { idField: 'id' }).pipe(
      map(tips => {
        if (!tips || tips.length === 0) return null;
        const index = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
        return tips[index % tips.length];
      })
    );

    this.titles$ = this.featuredRecipes$.pipe(map(recipes => recipes.map(r => r.title)));
  }

  // --- MÉTODOS DE APOYO ---

  getRandomPhrase(recipeTitle: string): string {
    const phrases = [
      `Chefly hoy te recomienda comer: ${recipeTitle}`,
      `¿No se te antoja hoy ${recipeTitle}?`,
      `Dale un gusto a tu paladar con: ${recipeTitle}`
    ];
    const index = recipeTitle.length % phrases.length;
    return phrases[index];
  }

  onSearch(event: any) {
    this.searchTerm$.next(event.target.value);
  }

  filterByCategory(category: string) {
    this.categoryFilter$.next(this.categoryFilter$.value === category ? '' : category);
  }

  getDifficultyStyle(difficulty: string | undefined | null): string {
    if (!difficulty) return 'bg-gray-100 text-gray-800 border-gray-200';
    const diff = difficulty.toLowerCase();
    if (diff.includes('fácil')) return 'bg-green-100 text-green-800 border-green-200';
    if (diff.includes('intermedio')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  }

  // --- LÓGICA DE REACCIONES Y COMENTARIOS (FIX ERRORES TS2339) ---

  getSavedReaction(tipId: string): string | null {
    const reactedTips = JSON.parse(localStorage.getItem('reactedTips') || '{}');
    return reactedTips[tipId] || null;
  }

  async reactToTip(tipId: string, type: string) {
    const reactedTips = JSON.parse(localStorage.getItem('reactedTips') || '{}');
    if (reactedTips[tipId]) return;
    const tipRef = doc(this.firestore, 'tips', tipId);
    try {
      await updateDoc(tipRef, { [`reactions.${type}`]: increment(1) });
      reactedTips[tipId] = type;
      localStorage.setItem('reactedTips', JSON.stringify(reactedTips));
    } catch (e) { console.error("Error al reaccionar:", e); }
  }

  async addComment(tipId: string, commentInput: HTMLInputElement) {
    const text = commentInput.value.trim();
    if (!text) return;
    const tipRef = doc(this.firestore, 'tips', tipId);
    try {
      await updateDoc(tipRef, {
        comments: arrayUnion({
          userName: this.currentUserData?.displayName || 'Cocinero Chefly',
          text: text,
          date: new Date().toISOString()
        })
      });
      commentInput.value = '';
    } catch (e) { console.error("Error al comentar:", e); }
  }

  async trackView(recipeId: string | undefined) {
    if (!recipeId) return;
    const recipeRef = doc(this.firestore, 'recipes', recipeId);
    try { await updateDoc(recipeRef, { views: increment(1) }); }
    catch (e) { console.error(e); }
  }

  login() { this.authService.loginWithGoogle(); }
  logout() { this.authService.logout(); }
}
