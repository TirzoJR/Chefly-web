import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';

import { RecipeDetailComponent } from './pages/recipe-detail/recipe-detail';
import { UserProfileComponent } from './pages/user-profile/user-profile';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'profile', component: UserProfileComponent }, // 👈 Esto debe existir
  { path: 'recipe/:id', component: RecipeDetailComponent },
  { path: '**', redirectTo: '' } // Redirigir al home si la ruta no existe
];