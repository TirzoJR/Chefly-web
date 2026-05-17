import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import {
  Auth,
  authState,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private injector = inject(Injector); // 👈 Inyectamos el Injector

  readonly user$: Observable<User | null>;

  constructor() {
    this.user$ = authState(this.auth);
  }

  getUserData(uid: string): Observable<any> {
    // 🛠️ Usamos la función envolvente correcta para que TypeScript no marque error
    return runInInjectionContext(this.injector, () => {
      const userRef = doc(this.firestore, `users/${uid}`);
      return docData(userRef);
    });
  }

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}
