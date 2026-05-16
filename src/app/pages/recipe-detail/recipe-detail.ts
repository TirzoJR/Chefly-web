import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  addDoc
  ,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  docData,
  Firestore,
  getCountFromServer,
  increment,
  query,
  updateDoc,
  where
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth';

import { map, Observable, of, switchMap, tap } from 'rxjs';

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
  private router = inject(Router);

  activeTab: 'recipe' | 'comments' | 'info' = 'recipe';
  newComment = '';
  showReportModal = false;


  reportReason: string = '';

  recipe$: Observable<any> | undefined;
  currentUserData: any = null;
  completedSteps: number[] = [];

  foodAvatars: string[] = [
    'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
    'https://cdn-icons-png.flaticon.com/512/1404/1404945.png',
    'https://cdn-icons-png.flaticon.com/512/4727/4727450.png',
    'https://cdn-icons-png.flaticon.com/512/2515/2515228.png',
    'https://cdn-icons-png.flaticon.com/512/3143/3143643.png',
    'https://cdn-icons-png.flaticon.com/512/1134/1134447.png',
  ];

  ngOnInit() {
    this.recipe$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(null);
        this.incrementView(id);

        return docData(doc(this.firestore, `recipes/${id}`), { idField: 'id' }).pipe(
          map((recipe: any) => {
            if (!recipe) return null;
            return {
              ...recipe,
              time: recipe.time || recipe.prepTime || recipe.cookingTime || 0,
              portions: recipe.portions || recipe.servings || recipe.porciones || 0
            };
          })
        );
      }),
      tap(async (recipe: any) => {
        if (recipe) {
          const authorId = recipe.uid || recipe.userId;
          if (authorId) this.countAuthorRecipes(authorId);
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

  async onToggleFavorite(recipeId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      Swal.fire('Inicia sesión', 'Debes estar logueado para guardar favoritos', 'info');
      return;
    }

    try {
      const userRef = doc(this.firestore, `users/${user.uid}`);
      let newFavs = [...(this.currentUserData?.favorites || [])];

      if (newFavs.includes(recipeId)) {
        newFavs = newFavs.filter((id: string) => id !== recipeId);
      } else {
        newFavs.push(recipeId);
      }
      await updateDoc(userRef, { favorites: newFavs });
    } catch (error) {
      console.error("Error al actualizar favoritos", error);
    }
  }

  toggleStep(index: number) {
    if (this.completedSteps.includes(index)) {
      this.completedSteps = this.completedSteps.filter(i => i !== index);
    } else {
      this.completedSteps.push(index);
    }
  }

  isStepCompleted(index: number): boolean { return this.completedSteps.includes(index); }
  getCompletedCount(): number { return this.completedSteps.length; }

  async addComment(recipeId: string) {
    if (!this.newComment.trim()) return;
    const user = this.authService.getCurrentUser();
    if (!user) return alert('Inicia sesión para comentar');

    const recipeRef = doc(this.firestore, `recipes/${recipeId}`);
    await updateDoc(recipeRef, {
      comments: arrayUnion({
        uid: user.uid,
        userName: this.currentUserData?.displayName || user.displayName || 'Chef',
        photoURL: this.currentUserData?.photoURL || user.photoURL,
        text: this.newComment,
        date: new Date().toISOString()
      })
    });
    this.newComment = '';
  }

  async rateRecipe(recipeId: string, rating: number) {
    if (!this.currentUserData) {
    this.authService.loginWithGoogle();
    return;
  }
     await updateDoc(doc(this.firestore, `recipes/${recipeId}`), {
       rating: rating,
       ratingCount: increment(1)
     });
  }

  async countAuthorRecipes(authorId: string) {
    try {
      const q = query(collection(this.firestore, 'recipes'), where('uid', '==', authorId));
      const snapshot = await getCountFromServer(q);
      this.authorRecipeCount = snapshot.data().count;
    } catch (e) { console.error(e); }
  }

  getUserImage(uid: string | undefined, photoURL: string | null | undefined): string {
    if (photoURL && photoURL.length > 10) return photoURL;
    if (!uid) return this.foodAvatars[0];
    let sum = 0;
    for (let i = 0; i < uid.length; i++) sum += uid.charCodeAt(i);
    return this.foodAvatars[sum % this.foodAvatars.length];
  }

  setActiveTab(tab: 'recipe' | 'comments' | 'info') { this.activeTab = tab; }

  getDifficultyStyle(difficulty: string): string {
    const diff = (difficulty || '').toLowerCase();
    if (diff.includes('fácil')) return 'bg-green-100 text-green-700 border-green-200';
    if (diff.includes('intermedio') || diff.includes('media')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (diff.includes('difícil')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700';
  }

  incrementView(recipeId: string) {
    updateDoc(doc(this.firestore, `recipes/${recipeId}`), { views: increment(1) });
  }

  async deleteRecipe(recipeId: string | undefined) {
    if (!recipeId) return;
    const res = await Swal.fire({ title: '¿Borrar?', text: "Se eliminará para siempre", icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
      await deleteDoc(doc(this.firestore, 'recipes', recipeId));
      this.router.navigate(['/']);
    }
  }

  canEditOrDelete(recipe: any): boolean {
    if (!this.currentUserData) return false;
    return this.currentUserData.role === 'admin' || (recipe.uid || recipe.userId) === this.currentUserData.uid;
  }

  openReportModal() {
if (!this.currentUserData) {
    this.authService.loginWithGoogle();
    return;
  }
  this.showReportModal = true;
    this.showReportModal = true; }

  closeReportModal() {
    this.showReportModal = false;
    this.reportReason = ''; // Limpiamos la razón al cerrar
  }


  async submitReport(recipeId: string, recipeTitle: string) {
    if (!this.reportReason) {
      Swal.fire('Aviso', 'Por favor selecciona el motivo del reporte', 'warning');
      return;
    }

    try {
      await addDoc(collection(this.firestore, 'reports'), {
        recipeId: recipeId,
        recipeTitle: recipeTitle,
        reason: this.reportReason,
        date: new Date().toISOString()
      });
      Swal.fire('Reporte Enviado', 'Los administradores revisarán esta receta lo antes posible.', 'success');
      this.closeReportModal();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un problema al enviar tu reporte', 'error');
    }
  }

  downloadPDF() { window.print(); }
}
