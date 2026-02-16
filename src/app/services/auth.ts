import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
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

  // Observable que contiene al usuario (o null si no está logueado)
  // AngularFire actualiza esto automáticamente
  readonly user$: Observable<User | null> = authState(this.auth);

  constructor() { }

  // 1. Iniciar sesión con Google
  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
      // Opcional: Redirigir al perfil después de loguearse
      // this.router.navigate(['/profile']);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  }

  // 2. Cerrar sesión
  async logout() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/']); // Redirigir al inicio
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  // 3. Obtener el usuario actual (síncrono, útil para guards)
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}