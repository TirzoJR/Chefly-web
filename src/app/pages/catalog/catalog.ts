import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Firestore, collection, query, collectionData, orderBy } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog.html'
})
export class CatalogComponent implements OnInit {
  private firestore = inject(Firestore);

  // --- VARIABLES DE UI ---
  showFilters = false;
  viewMode: 'grid' | 'list' = 'grid';
  isLoading = true;

  // --- CRITERIOS DE BÚSQUEDA ---
  searchTerm$ = new BehaviorSubject<string>('');
  selectedCategory$ = new BehaviorSubject<string>('Todas');
  selectedDifficulty$ = new BehaviorSubject<string>('Todas');
  sortBy$ = new BehaviorSubject<string>('recent');

  // --- DATOS ---
  recipes$!: Observable<any[]>;
  filteredRecipes$!: Observable<any[]>;

  // --- CATEGORÍAS (Visuales) ---
  categories = [
    { name: 'Desayuno', icon: '🍳', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=600&auto=format&fit=crop', count: 0 },
    { name: 'Comida', icon: '🍽️', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop', count: 0 },
    { name: 'Cena', icon: '🌙', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop', count: 0 },
    { name: 'Postre', icon: '🍰', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=600&auto=format&fit=crop', count: 0 },
    { name: 'Snack', icon: '🍿', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?q=80&w=600&auto=format&fit=crop', count: 0 },
    { name: 'Bebida', icon: '🥤', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=600&auto=format&fit=crop', count: 0 }
  ];

  ngOnInit() {
    this.loadRecipes();
  }

  loadRecipes() {
    // 1. Traemos TODAS las recetas públicas de Firestore
    const recipesRef = collection(this.firestore, 'recipes');
    const q = query(recipesRef, orderBy('createdAt', 'desc'));

    this.recipes$ = collectionData(q, { idField: 'id' });

    // 2. Creamos la lógica combinada de filtrado
    this.filteredRecipes$ = combineLatest([
      this.recipes$,
      this.searchTerm$,
      this.selectedCategory$,
      this.selectedDifficulty$,
      this.sortBy$
    ]).pipe(
      map(([recipes, search, category, difficulty, sort]) => {


        this.updateCategoryCounts(recipes);


        let result = recipes;

        // Búsqueda por texto (título, autor o descripción)
        if (search.trim() !== '') {
          const lowerSearch = search.toLowerCase();
          result = result.filter(r =>
            (r.title && r.title.toLowerCase().includes(lowerSearch)) ||
            (r.authorName && r.authorName.toLowerCase().includes(lowerSearch)) ||
            (r.ingredients && r.ingredients.some((i: string) => i.toLowerCase().includes(lowerSearch)))
          );
        }

        // Filtro Categoría
        if (category !== 'Todas') {
          result = result.filter(r => r.category === category);
        }

        // Filtro Dificultad
        if (difficulty !== 'Todas') {
          result = result.filter(r => r.difficulty === difficulty);
        }

        // --- APLICAMOS ORDENAMIENTO ---
        result = [...result].sort((a, b) => {
          switch (sort) {
            case 'popular':
              return (b.views || 0) - (a.views || 0);
            case 'rating':
              return (b.rating || 0) - (a.rating || 0);
            case 'time':
              return (a.time || 999) - (b.time || 999);
            case 'recent':
            default:
              return b.createdAt - a.createdAt;
          }
        });

        this.isLoading = false;
        return result;
      })
    );
  }



  onSearchChange(event: any) {
    this.searchTerm$.next(event.target.value);
  }

  selectCategory(categoryName: string) {
    this.selectedCategory$.next(categoryName);

    document.getElementById('resultados')?.scrollIntoView({ behavior: 'smooth' });
  }

  onFilterChange(type: 'category' | 'difficulty' | 'sort', event: any) {
    const value = event.target.value;
    if (type === 'category') this.selectedCategory$.next(value);
    if (type === 'difficulty') this.selectedDifficulty$.next(value);
    if (type === 'sort') this.sortBy$.next(value);
  }

  resetFilters() {
    this.searchTerm$.next('');
    this.selectedCategory$.next('Todas');
    this.selectedDifficulty$.next('Todas');
    this.sortBy$.next('recent');


    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    if(searchInput) searchInput.value = '';
  }

  toggleViewMode(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }


  private updateCategoryCounts(recipes: any[]) {
    this.categories.forEach(cat => {
      cat.count = recipes.filter(r => r.category === cat.name).length;
    });
  }

  
  getDifficultyColor(diff: string): string {
    switch(diff?.toLowerCase()) {
      case 'fácil': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200';
      case 'media': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200';
      case 'difícil': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }
}
