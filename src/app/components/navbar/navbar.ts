import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink,RouterLinkActive } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink,RouterLinkActive],
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  
  user$ = this.authService.user$;
  
  // Estados de Accesibilidad
  isDarkMode = false;
  showAccessMenu = false;
  fontSize: 'small' | 'medium' | 'large' = 'medium';

  ngOnInit() {
    // 1. Cargar preferencias guardadas al iniciar
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.fontSize = (localStorage.getItem('fontSize') as any) || 'medium';
    
    // 2. Aplicar configuraciones al DOM
    this.applyTheme();
    this.applyFontSize();
  }

  // --- MÉTODOS DE TEMA ---
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    const root = document.documentElement; // Esto selecciona la etiqueta <html>
    if (this.isDarkMode) {
      root.classList.add('dark');
      // Esto elimina cualquier "espacio en blanco" que Tailwind no alcance a cubrir
      document.body.style.backgroundColor = 'oklch(0.145 0 0)'; 
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#F8FAFC'; // chefly.gray
    }
  }

  // --- MÉTODOS DE TEXTO ---
  toggleAccessMenu() {
    this.showAccessMenu = !this.showAccessMenu;
  }

  setFontSize(size: 'small' | 'medium' | 'large') {
    this.fontSize = size;
    localStorage.setItem('fontSize', size);
    this.applyFontSize();
    this.showAccessMenu = false; // Cerrar menú al elegir
  }

  private applyFontSize() {
    const root = document.documentElement;
    const sizes = { 
      small: '14px', 
      medium: '16px', 
      large: '20px' 
    };
    root.style.fontSize = sizes[this.fontSize];
  }

  // --- NAVEGACIÓN ---
  goToProfile() {
    this.router.navigate(['/profile']);
  }

  logout() {
    if (window.confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      this.authService.logout();
    }
  }
}