import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.scss'
})
export class RecipeDetailComponent {
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);

  recipe$: Observable<Recipe | undefined>;

  constructor() {
    const recipeId = this.route.snapshot.paramMap.get('id');
    if (recipeId) {
      const docRef = doc(this.firestore, 'recipes', recipeId);
      this.recipe$ = docData(docRef, { idField: 'id' }) as Observable<Recipe>;
    } else {
      this.recipe$ = new Observable();
    }
  }
}