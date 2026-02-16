import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
// IMPORTANTE: Asegúrate de importar todo de @angular/fire/firestore
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recipe-detail.html'
})
export class RecipeDetailComponent {
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  showReportModal: boolean = false;



  getStars(rating: number): number[] {
    const stars = [];
    const fullStars = Math.floor(rating); // Parte entera
    

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(1); // Estrella llena
      } else {
        stars.push(0); // Estrella vacía
      }
    }
    return stars;
  }
  openReportModal() {
    this.showReportModal = true;
  }

  closeReportModal() {
    this.showReportModal = false;
  }

  submitReport() {
    
    console.log('Reporte enviado');
    alert('Gracias por tu reporte. Los administradores lo revisarán.');
    this.closeReportModal();
  }

  recipe$: Observable<Recipe | undefined>;
  activeTab: string = 'recipe';
  completedStepIndices = new Set<number>();

  constructor() {
    this.recipe$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(undefined);
        
        // Usamos la instancia inyectada 'this.firestore' para evitar el error de contexto
        const docRef = doc(this.firestore, `recipes/${id}`);
        return docData(docRef, { idField: 'id' }) as Observable<Recipe>;
      })
    );
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  // --- LÓGICA DE PROGRESO ---
  toggleStep(index: number) {
    if (this.completedStepIndices.has(index)) {
      this.completedStepIndices.delete(index);
    } else {
      this.completedStepIndices.add(index);
    }
  }

  isStepCompleted(index: number): boolean {
    return this.completedStepIndices.has(index);
  }

  getCompletedCount(): number {
    return this.completedStepIndices.size;
  }

  // --- ESTILOS DINÁMICOS ---
  getDifficultyStyle(difficulty: string | undefined | null): string {
    if (!difficulty) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const diff = difficulty.toLowerCase();
    
    // NOTA: Solo devolvemos colores de fondo y texto. 
    // Los bordes los controlamos en el HTML si es necesario para evitar conflictos.
    if (diff.includes('fácil') || diff.includes('facil')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    if (diff.includes('intermedio') || diff.includes('media')) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
    if (diff.includes('difícil') || diff.includes('dificil')) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getAvatarColor(name: string | undefined): string {
    if (!name) return 'bg-gray-200 text-gray-500';
    const colors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-orange-100 text-orange-600'];
    return colors[name.charCodeAt(0) % colors.length];
  }
}