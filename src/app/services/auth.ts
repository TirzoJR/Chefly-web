import { Injectable, inject } from '@angular/core';
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
  private firestore = inject(Firestore); // <--- ESTA LÍNEA ES VITAL

  // Observable que contiene al usuario (o null si no está logueado)
  readonly user$: Observable<User | null> = authState(this.auth);

  constructor() { }

  /**
   * Obtiene los datos del perfil desde la colección 'users' de Firestore
   * @param uid ID único del usuario
   */
  getUserData(uid: string): Observable<any> {
    const userRef = doc(this.firestore, `users/${uid}`);
    return docData(userRef);
  }

  // 1. Iniciar sesión con Google
  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  }

  // 2. Cerrar sesión
  async logout() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/']); 
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  // 3. Obtener el usuario actual (síncrono)
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}