import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy, limit } from '@angular/fire/firestore';
import { AsyncPipe, NgFor, NgIf, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Recipe } from '../../models/recipe.model';


import { register } from 'swiper/element/bundle';
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
  private firestore = inject(Firestore);

  featuredRecipes$: Observable<Recipe[]>;

  recipes$: Observable<Recipe[]>;

  constructor() {
    const recipesCol = collection(this.firestore, 'recipes');

    const featuredQuery = query(
      recipesCol, 
      orderBy('rating', 'desc'), 
      orderBy('views', 'desc'), 
      limit(5)
    );
    this.featuredRecipes$ = collectionData(featuredQuery, { idField: 'id' }) as Observable<Recipe[]>;

    
    this.recipes$ = collectionData(query(recipesCol), { idField: 'id' }) as Observable<Recipe[]>;
  }
}