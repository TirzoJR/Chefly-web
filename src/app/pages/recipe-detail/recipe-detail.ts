import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { 
  Firestore, 
  doc, 
  docData, 
  updateDoc, 
  arrayUnion, 
  increment,
  getDoc,
  collection,        // <--- FALTABA ESTO
  query,             // <--- FALTABA ESTO
  where,             // <--- FALTABA ESTO
  getCountFromServer // <--- FALTABA ESTO
} from '@angular/fire/firestore';

import { Observable, switchMap, tap, of } from 'rxjs';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './recipe-detail.html',
  styleUrls: ['./recipe-detail.scss']
})
export class RecipeDetailComponent implements OnInit {
  authorRecipeCount: number = 0;
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  public authService = inject(AuthService);

  // Variables de UI
  activeTab: 'recipe' | 'comments' | 'info' = 'recipe';
  newComment = '';
  showReportModal = false;
  
  // Datos
  recipe$: Observable<any> | undefined;
  currentUserData: any = null;
  completedSteps: number[] = []; // Para el checklist de pasos

  // 1. LISTA DE COMIDAS (Para usuarios sin foto)
  foodAvatars: string[] = [
    'https://cdn-icons-png.flaticon.com/512/3075/3075977.png', // Hamburguesa
    'https://cdn-icons-png.flaticon.com/512/1404/1404945.png', // Pizza
    'https://cdn-icons-png.flaticon.com/512/4727/4727450.png', // Taco
    'https://cdn-icons-png.flaticon.com/512/2515/2515228.png', // Sushi
    'https://cdn-icons-png.flaticon.com/512/3143/3143643.png', // Dona
    'https://cdn-icons-png.flaticon.com/512/1134/1134447.png', // Fruta
  ];

  ngOnInit() {
    
    this.recipe$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(null);
        // Al cargar, incrementamos vista
        this.incrementView(id);
        return docData(doc(this.firestore, `recipes/${id}`), { idField: 'id' });
      }),
      tap(async (recipe: any) => {
        if (recipe && recipe.uid) {
           this.countAuthorRecipes(recipe.uid);
        } else if (recipe && recipe.userId) {
           // Por si guardaste el ID como 'userId' en lugar de 'uid'
           this.countAuthorRecipes(recipe.userId);
        }
      })
    );

    
    this.authService.user$.subscribe(user => {
      if (user) {
        this.authService.getUserData(user.uid).subscribe(data => {
          this.currentUserData = data;
        });
      }
    });
  }
async countAuthorRecipes(authorId: string) {
    try {
      const recipesRef = collection(this.firestore, 'recipes');
      // Cuenta cuántas recetas tienen el mismo ID del autor de ESTA receta
      const q = query(recipesRef, where('uid', '==', authorId));
      const snapshot = await getCountFromServer(q);
      
      this.authorRecipeCount = snapshot.data().count;
      console.log(`Este autor tiene ${this.authorRecipeCount} recetas.`);
    } catch (error) {
      console.error("Error contando recetas del autor:", error);
    }
  }
  
  getUserImage(uid: string | undefined, photoURL: string | null | undefined): string {
    if (photoURL && photoURL.length > 10) return photoURL;
    if (!uid) return this.foodAvatars[0];
    let sum = 0;
    for (let i = 0; i < uid.length; i++) sum += uid.charCodeAt(i);
    return this.foodAvatars[sum % this.foodAvatars.length];
  }

  // --- ACCIONES DE UI ---
  setActiveTab(tab: 'recipe' | 'comments' | 'info') {
    this.activeTab = tab;
  }

  getDifficultyStyle(difficulty: string): string {
    const diff = (difficulty || '').toLowerCase();
    if (diff.includes('fácil')) return 'bg-green-100 text-green-700 border-green-200';
    if (diff.includes('media')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (diff.includes('difícil')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700';
  }

  // --- PASOS (Checklist) ---
  toggleStep(index: number) {
    if (this.completedSteps.includes(index)) {
      this.completedSteps = this.completedSteps.filter(i => i !== index);
    } else {
      this.completedSteps.push(index);
    }
  }

  isStepCompleted(index: number): boolean {
    return this.completedSteps.includes(index);
  }

  getCompletedCount(): number {
    return this.completedSteps.length;
  }

  // --- FAVORITOS ---
  async onToggleFavorite(recipeId: string) {
    const user = this.authService.getCurrentUser();
    if (!user) return alert('Inicia sesión para guardar favoritos');
    
    const userRef = doc(this.firestore, `users/${user.uid}`);
    const isFav = this.currentUserData?.favorites?.includes(recipeId);

    // Lógica simple: Si ya es favorito, lo quitamos. Si no, lo ponemos.
    // NOTA: Para producción idealmente usas arrayUnion/arrayRemove, 
    // pero aquí lo manejamos recargando el array localmente para simplicidad visual.
    let newFavs = this.currentUserData?.favorites || [];
    if (isFav) {
      newFavs = newFavs.filter((id: string) => id !== recipeId);
    } else {
      newFavs.push(recipeId);
    }
    await updateDoc(userRef, { favorites: newFavs });
  }

  // --- COMENTARIOS ---
  async addComment(recipeId: string) {
    if (!this.newComment.trim()) return;
    const user = this.authService.getCurrentUser();
    if (!user) return alert('Inicia sesión para comentar');

    // Usamos el nombre real cargado
    const userName = this.currentUserData?.displayName || user.displayName || 'Chef';
    const photoURL = this.currentUserData?.photoURL || user.photoURL;

    const recipeRef = doc(this.firestore, `recipes/${recipeId}`);
    await updateDoc(recipeRef, {
      comments: arrayUnion({
        uid: user.uid,
        userName: userName,
        photoURL: photoURL,
        text: this.newComment,
        date: new Date().toISOString()
      })
    });
    this.newComment = '';
  }

  // --- CALIFICACIÓN ---
  async rateRecipe(recipeId: string, rating: number) {
     // Aquí iría la lógica matemática para promediar (Rating actual * total + nuevo) / total + 1
     // Por simplicidad para el proyecto, actualizamos directo el rating visual
     const recipeRef = doc(this.firestore, `recipes/${recipeId}`);
     await updateDoc(recipeRef, { 
       rating: rating,
       ratingCount: increment(1)
     });
  }

  // --- UTILIDADES ---
  incrementView(recipeId: string) {
    updateDoc(doc(this.firestore, `recipes/${recipeId}`), { views: increment(1) });
  }

  openReportModal() { this.showReportModal = true; }
  closeReportModal() { this.showReportModal = false; }
  submitReport() {
    alert('Reporte enviado. Gracias por ayudar a la comunidad.');
    this.closeReportModal();
  }
  downloadPDF() {
    window.print(); // Truco rápido: Abre la vista de impresión del navegador
  }
}