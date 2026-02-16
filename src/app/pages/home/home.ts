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
  where, 
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
  titles$: Observable<string[]>;
  
  // Observables para la UI
  user$: Observable<User | null> = this.authService.user$;
  featuredRecipes$: Observable<Recipe[]>;
  recipes$: Observable<Recipe[]>;
  tip$: Observable<any>;
  
  // Diccionario de estilos por categoría para el Tip
  categoryStyles: { [key: string]: string } = {
    'tecnica': 'bg-blue-50 border-blue-100 text-blue-800',
    'coccion': 'bg-orange-50 border-orange-100 text-orange-800',
    'sazon': 'bg-green-50 border-green-100 text-green-800',
    'seguridad': 'bg-red-50 border-red-100 text-red-800',
    'general': 'bg-gray-50 border-gray-100 text-gray-800'
  };

  constructor() {
    const recipesCol = collection(this.firestore, 'recipes');

    // 1. Carrusel: Recetas más vistas (Top 5)
    const featuredQuery = query(
      recipesCol, 
      orderBy('views', 'desc'),
      limit(5)
    );
    this.featuredRecipes$ = collectionData(featuredQuery, { idField: 'id' }) as Observable<Recipe[]>;
    this.featuredRecipes$ = collectionData(featuredQuery, { idField: 'id' }).pipe(
  map(recipes => recipes.slice(0, 4)) // Solo tomamos 4 para el abanico
) as Observable<Recipe[]>;

    // 2. Grid: Todas las recetas
    this.recipes$ = collectionData(query(recipesCol), { idField: 'id' }) as Observable<Recipe[]>;

    // 3. Lógica Automatizada del Tip del Día
    // En lugar de filtrar por fecha fija, rotamos todos los tips existentes
    const tipsCol = collection(this.firestore, 'tips');
    this.tip$ = collectionData(tipsCol, { idField: 'id' }).pipe(
      map(tips => {
        if (!tips || tips.length === 0) return null;

        // Algoritmo: (Días transcurridos desde fecha base) MODULO (Total de tips)
        const startDate = new Date('2026-01-01').getTime();
        const today = new Date().getTime();
        const diffInDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        
        const tipIndex = diffInDays % tips.length;
        console.log(`Mostrando tip índice ${tipIndex} de ${tips.length} totales`);
        return tips[tipIndex];
      })
    );
    this.titles$ = this.featuredRecipes$.pipe(
    map(recipes => recipes.map(r => r.title))
  );
  }

  // --- MÉTODOS AUXILIARES ---

  /** Retorna las clases de Tailwind según la categoría del tip */
  getTipStyle(category: string): string {
    return this.categoryStyles[category?.toLowerCase()] || this.categoryStyles['general'];
  }

  /** Verifica si el usuario ya reaccionó a este tip específico en este navegador */
  getSavedReaction(tipId: string): string | null {
    const reactedTips = JSON.parse(localStorage.getItem('reactedTips') || '{}');
    return reactedTips[tipId] || null;
  }

  // --- INTERACCIONES CON FIREBASE ---

  /** Registra reacción única por tip */
  async reactToTip(tipId: string, type: 'love' | 'like' | 'wow') {
    if (!tipId || this.getSavedReaction(tipId)) return;

    const tipRef = doc(this.firestore, 'tips', tipId);
    try {
      // Incremento atómico en Firebase
      await updateDoc(tipRef, {
        [`reactions.${type}`]: increment(1)
      });

      // Guardar elección en localStorage
      const reactedTips = JSON.parse(localStorage.getItem('reactedTips') || '{}');
      reactedTips[tipId] = type; 
      localStorage.setItem('reactedTips', JSON.stringify(reactedTips));
    } catch (error) {
      console.error("Error al reaccionar:", error);
    }
  }

  /** Suma una vista a la receta seleccionada */
  async trackView(recipeId: string | undefined) {
    if (!recipeId) return;
    const recipeRef = doc(this.firestore, 'recipes', recipeId);
    try {
      await updateDoc(recipeRef, { views: increment(1) });
    } catch (error) {
      console.error("Error al actualizar vistas:", error);
    }
  }

  /** Agrega un comentario al array de Firebase */
  async addComment(tipId: string, commentInput: HTMLInputElement) {
    const text = commentInput.value.trim();
    if (!text || !tipId) return;

    const tipRef = doc(this.firestore, 'tips', tipId);
    try {
      await updateDoc(tipRef, {
        comments: arrayUnion({
          userName: 'Usuario Chef', 
          text: text,
          date: new Date()
        })
      });
      commentInput.value = ''; // Limpiar campo
    } catch (error) {
      console.error("Error al comentar:", error);
    }
  }

// --- Dentro de tu clase HomeComponent ---

/** Retorna el color del badge según la dificultad de la receta */
getDifficultyStyle(difficulty: string | undefined | null): string {
  // Manejo de valores indefinidos o nulos
  if (!difficulty) return 'bg-gray-100 text-gray-800 border-gray-200';

  const diff = difficulty.toLowerCase();
  
  if (diff.includes('fácil') || diff.includes('facil')) {
    return 'bg-green-100 text-green-800 border-green-200';
  } 
  else if (diff.includes('intermedio') || diff.includes('media')) {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  } 
  else if (diff.includes('difícil') || diff.includes('dificil')) {
    return 'bg-red-100 text-red-800 border-red-200';
  }

  return 'bg-gray-100 text-gray-800 border-gray-200';
}
login() {
    this.authService.loginWithGoogle();
  }
logout() {
    // 1. Mensaje de prueba en la consola (F12)
    console.log("Botón presionado. Intentando mostrar confirmación...");

    // 2. Usamos window.confirm explícitamente
    const confirmacion = window.confirm("¿Estás seguro de que quieres cerrar sesión?");

    // 3. Verificamos qué eligió el usuario
    if (confirmacion) {
      console.log("Usuario dijo SÍ. Cerrando sesión...");
      this.authService.logout();
    } else {
      console.log("Usuario dijo CANCELAR.");
    }
  }
}