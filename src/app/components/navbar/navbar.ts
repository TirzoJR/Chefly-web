import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink,RouterLinkActive } from '@angular/router';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';


import { AuthService } from '../../services/auth'; 

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html'
})
export class NavbarComponent { 

  // 1. Inyectamos el servicio
  private authService = inject(AuthService);
  
  // 2. Variable para saber si hay usuario (para el *ngIf del HTML)
  user$ = this.authService.user$;

  // 3. Función Login (si tienes botón de login en el navbar)
  login() {
    this.authService.loginWithGoogle();
  }

  // 4. ✅ FUNCIÓN LOGOUT CON CONFIRMACIÓN
  logout() {
    console.log("Intentando cerrar sesión desde el Navbar..."); // Log para depurar
    
    const confirmacion = window.confirm("¿Estás seguro de que quieres cerrar sesión?");

    if (confirmacion) {
      this.authService.logout();
    }
  }
}