import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { RecipeFormComponent } from './pages/recipe-form/recipe-form';
import { RecipeDetailComponent } from './pages/recipe-detail/recipe-detail';
import { UserProfileComponent } from './pages/user-profile/user-profile';
import { authGuard } from './services/auth.guard';
import { adminGuard } from './services/admin.guard';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard';
import { CatalogComponent } from './pages/catalog/catalog';
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'recipe/:id', component: RecipeDetailComponent },
  { path: 'agregar-receta', component: RecipeFormComponent, canActivate: [authGuard] },
  { path: 'editar-receta/:id', component: RecipeFormComponent, canActivate: [authGuard] },
  { path: 'profile', component: UserProfileComponent, canActivate: [authGuard] },
  { path: 'perfil/:id', component: UserProfileComponent },
  { path: 'catalogo', component: CatalogComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
{ path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }
];
