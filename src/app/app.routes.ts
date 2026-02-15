import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
// Importamos el componente que creaste con el comando
import { RecipeDetailComponent } from './pages/recipe-detail/recipe-detail';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  // Esta línea conecta la URL /recipe/ID con tu nueva página
  { path: 'recipe/:id', component: RecipeDetailComponent },
  { path: '**', redirectTo: '' }
];