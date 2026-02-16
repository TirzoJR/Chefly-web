import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Firestore, doc, docData, updateDoc, arrayUnion, arrayRemove } from '@angular/fire/firestore';
import { Observable, of, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Recipe } from '../../models/recipe.model';
import { AuthService } from '../../services/auth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './recipe-detail.html'
})
export class RecipeDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  public authService = inject(AuthService);

  recipeId: string = '';
  recipe$: Observable<Recipe | undefined> = of(undefined);
  activeTab: string = 'recipe';
  completedStepIndices = new Set<number>();
  showReportModal: boolean = false;
  newComment: string = '';
  
  currentUserData: any = null;
  private userSub?: Subscription;

  ngOnInit() {
    this.recipe$ = this.route.paramMap.pipe(
      switchMap(params => {
        this.recipeId = params.get('id') || '';
        if (!this.recipeId) return of(undefined);
        const docRef = doc(this.firestore, `recipes/${this.recipeId}`);
        return docData(docRef, { idField: 'id' }) as Observable<Recipe>;
      })
    );

    this.userSub = this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        return docData(doc(this.firestore, `users/${user.uid}`));
      })
    ).subscribe(data => this.currentUserData = data);
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  async onToggleFavorite(recipeId: string) {
    if (!this.currentUserData) return alert('Inicia sesión para guardar favoritos');
    const favorites = this.currentUserData.favorites || [];
    const isFav = favorites.includes(recipeId);
    const userRef = doc(this.firestore, `users/${this.currentUserData.uid}`);
    await updateDoc(userRef, {
      favorites: isFav ? arrayRemove(recipeId) : arrayUnion(recipeId)
    });
  }

  async rateRecipe(recipeId: string, stars: number) {
    if (!this.authService.getCurrentUser()) return alert('Inicia sesión para calificar');
    const recipeRef = doc(this.firestore, `recipes/${recipeId}`);
    await updateDoc(recipeRef, { rating: stars });
  }

async addComment(id: string | undefined) {
  const user = this.authService.getCurrentUser();
  if (!user || !this.newComment.trim() || !id) return;

  // LOG PARA LA CONSOLA: Abre F12 y mira qué sale aquí
  console.log('Tu UID es:', user.uid);
  console.log('Datos cargados de Firestore:', this.currentUserData);

  // SOLUCIÓN DE FUERZA: 
  // Si currentUserData tiene nombre, lo usa. Si no, usa el de Google. 
  // Si todo falla, usa tu nombre real manualmente para probar.
  const nombreParaGuardar = this.currentUserData?.displayName || user.displayName || "Tirzo Martinez";
  
  const recipeRef = doc(this.firestore, `recipes/${id}`);

  try {
    await updateDoc(recipeRef, {
      comments: arrayUnion({
        uid: user.uid,
        userName: nombreParaGuardar, 
        photoURL: this.currentUserData?.photoURL || user.photoURL || 'assets/default-avatar.png',
        text: this.newComment,
        date: new Date().toISOString()
      })
    });
    this.newComment = ''; 
    console.log('✅ Guardado como:', nombreParaGuardar);
  } catch (error) {
    console.error("❌ Error de Firebase:", error);
  }
}
  async downloadPDF() {
    const data = document.getElementById('recipe-content');
    if (!data) return;

    const originalTab = this.activeTab;
    this.activeTab = 'recipe'; // Forzar pestaña receta para capturar pasos

    setTimeout(async () => {
      const actions = document.querySelectorAll('.action-buttons');
      actions.forEach(el => (el as HTMLElement).style.display = 'none');
      
      try {
        const canvas = await html2canvas(data, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('Chefly-Receta.pdf');
      } finally {
        actions.forEach(el => (el as HTMLElement).style.display = '');
        this.activeTab = originalTab;
      }
    }, 200);
  }

  setActiveTab(tab: string) { this.activeTab = tab; }
  toggleStep(index: number) {
    this.completedStepIndices.has(index) ? this.completedStepIndices.delete(index) : this.completedStepIndices.add(index);
  }
  isStepCompleted(index: number) { return this.completedStepIndices.has(index); }
  getCompletedCount() { return this.completedStepIndices.size; }

  getDifficultyStyle(difficulty: string | undefined | null): string {
    if (!difficulty) return 'bg-gray-100 text-gray-800 border-gray-200';
    const diff = difficulty.toLowerCase();
    if (diff.includes('fácil')) return 'bg-green-100 text-green-700 border-green-200';
    if (diff.includes('intermedio')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (diff.includes('difícil')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }

  openReportModal() { this.showReportModal = true; }
  closeReportModal() { this.showReportModal = false; }
  submitReport() { alert('Reporte enviado.'); this.closeReportModal(); }
}