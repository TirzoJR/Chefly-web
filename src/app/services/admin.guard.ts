import { inject, Injector, runInInjectionContext } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth'; 
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { of } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const firestore = inject(Firestore);
  const injector = inject(Injector);

  return authService.user$.pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        router.navigate(['/']);
        return of(false);
      }

      // 🛠️ Ejecutamos la petición de Firebase blindada en el contexto
      const userDoc$ = runInInjectionContext(injector, () => {
        return docData(doc(firestore, `users/${user.uid}`));
      });

      return userDoc$.pipe(
        map((userData: any) => {
          if (userData && userData.role === 'admin') {
            return true;
          } else {
            router.navigate(['/']);
            return false;
          }
        })
      );
    })
  );
};
