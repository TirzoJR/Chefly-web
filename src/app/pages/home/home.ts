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
  private authService = inject(AuthService);
  private firestore = inject(Firestore);

  // Observables básicos
  user$: Observable<User | null> = this.authService.user$;
  featuredRecipes$: Observable<Recipe[]>;
  tip$: Observable<any>;
  titles$: Observable<string[]>;
  
  // --- LÓGICA DE BUSCADOR Y FILTROS ---
  
  // 1. Fuente de todas las recetas (Sin filtrar)
  private allRecipes$: Observable<Recipe[]>;

  // 2. Controladores de los filtros
  searchTerm$ = new BehaviorSubject<string>(''); 
  categoryFilter$ = new BehaviorSubject<string>(''); 

  // 3. Resultados Finales
  filteredRecipes$: Observable<Recipe[]>; 
  searchResults$: Observable<Recipe[]>;   
  recipes$: Observable<Recipe[]>; // <--- DECLARADA PARA EVITAR EL ERROR EN EL HTML

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
    'https://cdn-icons-png.flaticon.com/512/3143/3143643.png', 
    'https://cdn-icons-png.flaticon.com/512/1134/1134447.png', 
    'https://cdn-icons-png.flaticon.com/512/3274/3274099.png', 
    'https://cdn-icons-png.flaticon.com/512/2819/2819194.png'  
  ];
  // En tu clase HomeComponent
getRandomPhrase(recipeTitle: string): string {
  const phrases = [
    `Chefly hoy te recomienda comer: ${recipeTitle}`,
    `¡Qué rico! ¿No se te antoja hoy ${recipeTitle}?`,
    `Dale un gusto a tu paladar con: ${recipeTitle}`,
    `Hoy es el día perfecto para cocinar: ${recipeTitle}`,
    `¿Sin ideas? Chefly dice: ${recipeTitle}`,
    `¡Directo al corazón! Prueba hoy: ${recipeTitle}`
  ];
  // Usamos el nombre de la receta para que siempre le toque la misma frase y no parpadee
  const index = recipeTitle.length % phrases.length;
  return phrases[index];
}

  constructor() {
    const recipesCol = collection(this.firestore, 'recipes');

    this.authService.user$.subscribe(user => {
      if (user) {
        this.authService.getUserData(user.uid).subscribe((data: any) => {
          this.currentUserData = data;
        });
      }
    });

    const featuredQuery = query(recipesCol, orderBy('views', 'desc'), limit(4));
    this.featuredRecipes$ = collectionData(featuredQuery, { idField: 'id' }) as Observable<Recipe[]>;

    // Traemos TODAS las recetas de la colección
    this.allRecipes$ = collectionData(query(recipesCol), { idField: 'id' }) as Observable<Recipe[]>;

    // Lógica para filtrar el Grid por Categoría
    this.filteredRecipes$ = combineLatest([
      this.allRecipes$,
      this.categoryFilter$
    ]).pipe(
      map(([recipes, category]) => {
        if (!category) return recipes;
        return recipes.filter(r => r.category === category);
      })
    );

    // ASIGNACIÓN: Hacemos que recipes$ use el flujo filtrado para que el HTML no falle
    this.recipes$ = this.filteredRecipes$;

    // Lógica para el buscador (Dropdown)
    this.searchResults$ = combineLatest([
      this.allRecipes$,
      this.searchTerm$
    ]).pipe(
      map(([recipes, term]) => {
        const cleanTerm = term.toLowerCase().trim();
        if (!cleanTerm) return []; 
        return recipes.filter(r => 
          r.title.toLowerCase().includes(cleanTerm) || 
          r.category?.toLowerCase().includes(cleanTerm)
        ).slice(0, 5); 
      })
    );

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

  onSearch(event: any) {
    this.searchTerm$.next(event.target.value);
  }

  filterByCategory(category: string) {
    if (this.categoryFilter$.value === category) {
      this.categoryFilter$.next(''); 
    } else {
      this.categoryFilter$.next(category);
    }
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
    } catch (error) { console.error("Error al reaccionar:", error); }
  }

  async trackView(recipeId: string | undefined) {
    if (!recipeId) return;
    const recipeRef = doc(this.firestore, 'recipes', recipeId);
    try { await updateDoc(recipeRef, { views: increment(1) }); } 
    catch (error) { console.error("Error al actualizar vistas:", error); }
  }

  login() { this.authService.loginWithGoogle(); }

  logout() {
    if (window.confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      this.authService.logout();
    }
  }

  getUserImage(uid: string | undefined, photoURL: string | null | undefined): string {
    if (photoURL && photoURL.length > 10) return photoURL;
    if (!uid) return this.foodAvatars[0];
    let sum = 0;
    for (let i = 0; i < uid.length; i++) sum += uid.charCodeAt(i);
    return this.foodAvatars[sum % this.foodAvatars.length];
  }
}