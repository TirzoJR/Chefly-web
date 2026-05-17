import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  collectionData
} from '@angular/fire/firestore';

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
  showLogoutModal = false;

  fontSize: 'small' | 'medium' | 'large' = 'medium';

  constructor() {
    // 🛠️ Poner esto en el constructor arregla el error automáticamente
    const messagesQuery = query(collection(this.firestore, 'globalMessages'), orderBy('date', 'desc'), limit(1));
    this.latestMessage$ = collectionData(messagesQuery, { idField: 'id' }) as Observable<any[]>;
  }

  ngOnInit() {
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.fontSize = (localStorage.getItem('fontSize') as 'small' | 'medium' | 'large') || 'medium';
    this.dismissedMessageId = localStorage.getItem('dismissedMessageId');

    this.applyTheme();
    this.applyFontSize();

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

  dismissMessage(id: string) {
    this.dismissedMessageId = id;
    localStorage.setItem('dismissedMessageId', id);
  }

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
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (this.fontSize === 'small') {
        root.style.cssText += 'font-size: 13px !important;';
      } else if (this.fontSize === 'large') {
        root.style.cssText += 'font-size: 25px !important;';
      } else {
        root.style.cssText += 'font-size: 16px !important;';
      }
    }
  }

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

  goToProfile() { this.router.navigate(['/profile']); }
  logout() { this.showLogoutModal = true; }
  closeLogoutModal() { this.showLogoutModal = false; }
  confirmLogout() {
    this.showLogoutModal = false;
    this.authService.logout();
  }
}
