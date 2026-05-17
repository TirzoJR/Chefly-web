import { Component, inject, OnInit, OnDestroy, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import {
  Firestore,
  collection,
  query,
  where,
  collectionData,
  doc,
  updateDoc,
  setDoc,
  docData,
  arrayUnion,
  arrayRemove,
  documentId
} from '@angular/fire/firestore';
import { BehaviorSubject, Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-profile.html'
})
export class UserProfileComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private firestore = inject(Firestore);
  private route = inject(ActivatedRoute);
  private injector = inject(Injector);

  activeTab: 'info' | 'recipes' | 'favorites' | 'settings' | 'network' = 'info';
  isDarkMode = false;
  fontSize: 'small' | 'medium' | 'large' = 'medium';
  isEditingBio = false;
  bioText = '';

  currentUserData: any = null;
  profileData: any = null;

  recipesCount = 0;
  followersCount = 0;
  followingCount = 0;
  favoritesCount = 0;
  tipReactionsCount = 0;
  totalViews = 0;
  totalLikes = 0;

  user$ = this.authService.user$;

  userData$ = new BehaviorSubject<any>(null);
  myRecipes$ = new BehaviorSubject<any[]>([]);
  favoriteRecipes$ = new BehaviorSubject<any[]>([]);
  followersUsers$ = new BehaviorSubject<any[]>([]);
  followingUsers$ = new BehaviorSubject<any[]>([]);

  private mainSub = new Subscription();
  private profileSubs = new Subscription();

  ngOnInit() {
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.fontSize = (localStorage.getItem('fontSize') as any) || 'medium';
    this.applyTheme();

    // 🛠️ 1. AUTO-CREACIÓN BLINDADA INSTANTÁNEA
    this.mainSub.add(
      this.authService.user$.subscribe(user => {
        if (user) {
          runInInjectionContext(this.injector, () => {
            const sub = docData(doc(this.firestore, `users/${user.uid}`)).subscribe(async data => {
              if (!data) {
                // Si tienes sesión activa pero no tienes documento, lo crea al instante
                const newProfile = {
                  uid: user.uid,
                  displayName: user.displayName || 'Chef',
                  email: user.email,
                  photoURL: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/1404/1404945.png',
                  bio: '¡Hola! Soy nuevo en Chefly.',
                  role: 'user',
                  favorites: [],
                  followers: [],
                  following: [],
                  createdAt: new Date().toISOString()
                };
                try {
                  await setDoc(doc(this.firestore, `users/${user.uid}`), newProfile);
                  this.currentUserData = newProfile;
                } catch (e) {
                  console.error('Error auto-creando perfil:', e);
                }
              } else {
                this.currentUserData = data;
              }
            });
            this.mainSub.add(sub);
          });
          const localReactions = JSON.parse(localStorage.getItem('reactedTips') || '{}');
          this.tipReactionsCount = Object.keys(localReactions).length;
        }
      })
    );

    // 2. Control de carga de perfiles
    this.mainSub.add(
      this.route.paramMap.subscribe(params => {
        const routeId = params.get('id');
        if (routeId) {
          this.loadProfileData(routeId);
        } else {
          this.authService.user$.subscribe(user => {
            if (user) this.loadProfileData(user.uid);
          });
        }
      })
    );
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.profileSubs.unsubscribe();
  }

  private loadProfileData(uid: string) {
    this.profileSubs.unsubscribe();
    this.profileSubs = new Subscription();

    runInInjectionContext(this.injector, () => {
      // A. Sincronización de Perfil
      const userSub = docData(doc(this.firestore, `users/${uid}`)).subscribe((data: any) => {
        const profile = data || {
          uid: uid,
          displayName: 'Cargando Chef...',
          email: 'Sincronizando datos...',
          photoURL: 'https://cdn-icons-png.flaticon.com/512/1404/1404945.png',
          favorites: [], followers: [], following: []
        };

        this.profileData = profile;
        this.userData$.next(profile);

        if (profile.bio) this.bioText = profile.bio;
        this.favoritesCount = profile.favorites?.length || 0;
        this.followersCount = profile.followers?.length || 0;
        this.followingCount = profile.following?.length || 0;

        if (profile.favorites && profile.favorites.length > 0) {
          const qFav = query(collection(this.firestore, 'recipes'), where(documentId(), 'in', profile.favorites.slice(0, 30)));
          this.profileSubs.add(collectionData(qFav, { idField: 'id' }).subscribe(favs => this.favoriteRecipes$.next(favs)));
        } else {
          this.favoriteRecipes$.next([]);
        }

        if (profile.followers && profile.followers.length > 0) {
          const qFol = query(collection(this.firestore, 'users'), where(documentId(), 'in', profile.followers.slice(0, 30)));
          this.profileSubs.add(collectionData(qFol, { idField: 'uid' }).subscribe(fols => this.followersUsers$.next(fols)));
        } else {
          this.followersUsers$.next([]);
        }

        if (profile.following && profile.following.length > 0) {
          const qFwi = query(collection(this.firestore, 'users'), where(documentId(), 'in', profile.following.slice(0, 30)));
          this.profileSubs.add(collectionData(qFwi, { idField: 'uid' }).subscribe(fwis => this.followingUsers$.next(fwis)));
        } else {
          this.followingUsers$.next([]);
        }
      });
      this.profileSubs.add(userSub);

      // B. Búsqueda de Recetas (Busca por el campo 'uid')
      const qRecipes = query(collection(this.firestore, 'recipes'), where('uid', '==', uid));
      const recipesSub = collectionData(qRecipes, { idField: 'id' }).subscribe((recipes: any[]) => {
        this.myRecipes$.next(recipes);
        this.recipesCount = recipes.length;
        this.totalViews = recipes.reduce((sum, r) => sum + (r.views || 0), 0);
        this.totalLikes = recipes.reduce((sum, r) => sum + (r.ratingCount || r.rating || 0), 0);
      });
      this.profileSubs.add(recipesSub);
    });
  }

  // ==========================================
  // MÉTODOS VISUALES Y ACCIONES
  // ==========================================

  get isMyProfile(): boolean {
    if (!this.currentUserData || !this.profileData) return false;
    return this.currentUserData.uid === this.profileData.uid;
  }

  get isFollowing(): boolean {
    if (!this.currentUserData || !this.profileData) return false;
    const followers = this.profileData.followers || [];
    return followers.includes(this.currentUserData.uid);
  }

  async toggleFollow() {
    if (!this.currentUserData) {
      Swal.fire('Inicia sesión', 'Debes iniciar sesión para seguir chefs.', 'info');
      return;
    }
    const profileRef = doc(this.firestore, `users/${this.profileData.uid}`);
    const currentUserRef = doc(this.firestore, `users/${this.currentUserData.uid}`);
    try {
      if (this.isFollowing) {
        await updateDoc(profileRef, { followers: arrayRemove(this.currentUserData.uid) });
        await updateDoc(currentUserRef, { following: arrayRemove(this.profileData.uid) });
      } else {
        await updateDoc(profileRef, { followers: arrayUnion(this.currentUserData.uid) });
        await updateDoc(currentUserRef, { following: arrayUnion(this.profileData.uid) });
      }
    } catch (error) {
      Swal.fire('Error', 'Hubo un problema al seguir.', 'error');
    }
  }

  getDifficultyStyle(difficulty: string | undefined | null): string {
    if (!difficulty) return 'bg-gray-100 text-gray-800 border-gray-200';
    const diff = difficulty.toLowerCase().trim();
    if (diff.includes('fácil') || diff.includes('facil')) return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
    if (diff.includes('intermedio') || diff.includes('media') || diff.includes('normal')) return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (diff.includes('difícil') || diff.includes('dificil')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-gray-100 text-gray-800 border-gray-200';
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
      document.body.style.backgroundColor = '#0F172A';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#F8FAFC';
    }
  }

  setFontSize(size: 'small' | 'medium' | 'large') {
    this.fontSize = size;
    localStorage.setItem('fontSize', size);
  }

  toggleEditBio() { this.isEditingBio = !this.isEditingBio; }

  async saveBio() {
    try {
      await updateDoc(doc(this.firestore, `users/${this.profileData.uid}`), { bio: this.bioText });
      this.isEditingBio = false;
    } catch (error) {
      console.error("Error al guardar la bio:", error);
    }
  }

  logout() {
    if (confirm('¿Estás seguro de cerrar sesión?')) this.authService.logout();
  }

  getFirstName(displayName: string | null | undefined): string {
    if (!displayName) return 'Chef';
    return displayName.trim().split(' ')[0];
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return 'U';
    try {
      return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    } catch {
      return 'U';
    }
  }
}
