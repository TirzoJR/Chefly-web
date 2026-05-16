import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router'; // 👈 Agregamos ActivatedRoute
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
  docData,
  getDocs,
  arrayUnion,
  arrayRemove,
  documentId,
  getCountFromServer
} from '@angular/fire/firestore';
import { Observable, switchMap, of, Subscription, tap, combineLatest, map } from 'rxjs'; // 👈 combineLatest y map
import { User } from '@angular/fire/auth';
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
  private route = inject(ActivatedRoute); // 👈 Para leer el :id de la URL

  activeTab: 'info' | 'recipes' | 'favorites' | 'settings' | 'network' = 'info';
  isDarkMode = false;
  fontSize: 'small' | 'medium' | 'large' = 'medium';
  isEditingBio: boolean = false;
  bioText: string = '';

  currentUserData: any = null; // Quien está usando la app
  profileData: any = null;     // De quién es el perfil que estamos viendo
  private userSub?: Subscription;

  recipesCount: number = 0;
  followersCount: number = 0;
  followingCount: number = 0;
  favoritesCount: number = 0;
  tipReactionsCount: number = 0;

  totalViews: number = 0;
  totalLikes: number = 0;

  user$ = this.authService.user$;

  // 👈 NUEVO: Lógica que decide qué ID usar (el de la URL o el tuyo)
  targetUid$ = this.route.paramMap.pipe(
    switchMap(params => {
      const routeId = params.get('id');
      if (routeId) {
        return of(routeId); // No esperamos a nadie, cargamos el perfil del autor
      } else {
        return this.user$.pipe(map(user => user?.uid || null));
      }
    })
  );

  // 1. Datos del perfil que estamos viendo
  userData$: Observable<any> = this.targetUid$.pipe(
    switchMap(uid => {
      if (!uid) return of(null);
      return docData(doc(this.firestore, `users/${uid}`)).pipe(
        // 👈 EL TRUCO MAGICO: Si Firebase no encuentra al usuario, creamos uno "fantasma"
        // para que la página no se quede cargando al infinito.
        map(data => data || {
          uid: uid,
          displayName: 'Chef Desconocido',
          email: 'Este perfil no tiene datos o fue eliminado',
          photoURL: 'https://cdn-icons-png.flaticon.com/512/1404/1404945.png'
        })
      );
    }),
    tap(data => this.profileData = data)
  );

  // 2. Recetas del perfil
  myRecipes$: Observable<any[]> = this.targetUid$.pipe(
    switchMap(uid => {
      if (!uid) return of([]);
      const q = query(collection(this.firestore, 'recipes'), where('uid', '==', uid));
      return collectionData(q, { idField: 'id' });
    }),
    tap(recipes => {
      this.totalViews = recipes.reduce((sum, r) => sum + (r.views || 0), 0);
      this.totalLikes = recipes.reduce((sum, r) => sum + (r.ratingCount || r.rating || 0), 0);
    })
  );

  // 3. Favoritos del perfil
  favoriteRecipes$: Observable<any[]> = this.userData$.pipe(
    switchMap(data => {
      const favIds = data?.favorites || [];
      if (favIds.length === 0) return of([]);
      const limitedIds = favIds.slice(0, 30);
      const q = query(collection(this.firestore, 'recipes'), where(documentId(), 'in', limitedIds));
      return collectionData(q, { idField: 'id' });
    })
  );

  // 4. Seguidores
  followersUsers$: Observable<any[]> = this.userData$.pipe(
    switchMap(data => {
      const followerIds = data?.followers || [];
      if (followerIds.length === 0) return of([]);
      const q = query(collection(this.firestore, 'users'), where(documentId(), 'in', followerIds.slice(0, 30)));
      return collectionData(q, { idField: 'uid' });
    })
  );

  // 5. Siguiendo
  followingUsers$: Observable<any[]> = this.userData$.pipe(
    switchMap(data => {
      const followingIds = data?.following || [];
      if (followingIds.length === 0) return of([]);
      const q = query(collection(this.firestore, 'users'), where(documentId(), 'in', followingIds.slice(0, 30)));
      return collectionData(q, { idField: 'uid' });
    })
  );

  ngOnInit() {
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.fontSize = (localStorage.getItem('fontSize') as any) || 'medium';
    this.applyTheme();

    // Saber quién está logueado para la lógica de Seguir
    this.userSub = this.authService.user$.subscribe(user => {
      if (user) {
        docData(doc(this.firestore, `users/${user.uid}`)).subscribe(data => {
          this.currentUserData = data;
        });

        const localReactions = JSON.parse(localStorage.getItem('reactedTips') || '{}');
        this.tipReactionsCount = Object.keys(localReactions).length;
      }
    });

    // Actualizar contadores cuando el perfil cambia
    this.userData$.subscribe(data => {
      if (data) {
        if (data.bio) this.bioText = data.bio;
        this.favoritesCount = data.favorites?.length || 0;
        this.followersCount = data.followers?.length || 0;
        this.followingCount = data.following?.length || 0;

        // Contar recetas
        const q = query(collection(this.firestore, 'recipes'), where('uid', '==', data.uid));
        getCountFromServer(q).then(snapshot => {
          this.recipesCount = snapshot.data().count;
        }).catch(e => console.error(e));
      }
    });
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  // --- LÓGICA DE SEGUIDORES (NUEVO) ---
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

  // --- RESTO DE MÉTODOS VISUALES (Se mantienen igual) ---
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
