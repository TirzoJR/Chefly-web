import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth';
import { Firestore, collection, query, orderBy, limit, collectionData } from '@angular/fire/firestore';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  private firestore = inject(Firestore);

  currentUserData: any = null;
  user$ = this.authService.user$;

  latestMessage$: Observable<any[]> | undefined;
  dismissedMessageId: string | null = null; 

  isDarkMode = false;
  showAccessMenu = false;
  fontSize: 'small' | 'medium' | 'large' = 'medium';

  ngOnInit() {
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.fontSize = (localStorage.getItem('fontSize') as any) || 'medium';


    this.dismissedMessageId = localStorage.getItem('dismissedMessageId');

    this.applyTheme();
    this.applyFontSize();

    // 👈 IMPORTANTE: Le agregamos
    const messagesQuery = query(collection(this.firestore, 'globalMessages'), orderBy('date', 'desc'), limit(1));
    this.latestMessage$ = collectionData(messagesQuery, { idField: 'id' }) as Observable<any[]>;

    this.authService.user$.subscribe(user => {
      if (user) {
        this.authService.getUserData(user.uid).subscribe(data => {
          this.currentUserData = data;
        });
      } else {
        this.currentUserData = null;
      }
    });
  }

  // 👈 NUEVA FUNCIÓN: Para ocultar el mensaje y recordarlo
  dismissMessage(id: string) {
    this.dismissedMessageId = id;
    localStorage.setItem('dismissedMessageId', id);
  }

  // --- MÉTODOS DE TEMA ---
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    const root = document.documentElement;
    if (this.isDarkMode) {
      root.classList.add('dark');
      document.body.style.backgroundColor = 'oklch(0.145 0 0)';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#F8FAFC';
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
    this.showAccessMenu = false;
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
