import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth';
import { map, take, switchMap, of } from 'rxjs';
import { Firestore, doc, docData } from '@angular/fire/firestore';

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const firestore = inject(Firestore);

  return authService.user$.pipe(
    take(1),
    switchMap(user => {
      // 1. Si no está logueado, lo mandamos al inicio
      if (!user) {
        router.navigate(['/']);
        return of(false);
      }

      // 2. Si está logueado, revisamos su perfil en Firestore buscando el rol
      return docData(doc(firestore, `users/${user.uid}`)).pipe(
        take(1),
        map((userData: any) => {
          if (userData?.role === 'admin') {
            return true; // ¡Adelante, jefe!
          } else {
            router.navigate(['/']); // Es usuario normal, para afuera
            return false;
          }
        })
      );
    })
  );
};
