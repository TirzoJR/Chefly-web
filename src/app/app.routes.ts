import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';

import { RecipeDetailComponent } from './pages/recipe-detail/recipe-detail';
import { UserProfileComponent } from './pages/user-profile/user-profile';
export const routes: Routes = [
  { path: '', component: HomeComponent },
  
  { path: 'recipe/:id', component: RecipeDetailComponent },
  { path: '**', redirectTo: '' },
  { path: 'profile', component: UserProfileComponent },
];