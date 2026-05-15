import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth';
import { map, take } from 'rxjs';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Revisa si hay un usuario logueado
  return authService.user$.pipe(
    take(1),
    map(user => {
      if (user) {
        return true; // Pásale, tienes cuenta
      } else {
        router.navigate(['/']); // ¡Para afuera! Lo regresamos al inicio
        return false;
      }
    })
  );
};
