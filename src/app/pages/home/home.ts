import { Component, inject, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
  limit,
  doc,
  docData,
  where,
  updateDoc,
  increment,
  arrayUnion
} from '@angular/fire/firestore';
import { AsyncPipe, NgFor, NgIf, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, map, BehaviorSubject, combineLatest, switchMap, of, Subscription } from 'rxjs';
import { Recipe } from '../../models/recipe.model';
import { register } from 'swiper/element/bundle';
import { AuthService } from '../../services/auth';
import { User } from '@angular/fire/auth';

register();

@Component({
  selector: 'app-home',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [AsyncPipe, NgFor, NgIf, RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private firestore = inject(Firestore);
  private injector = inject(Injector); // 👈 Inyectamos

  user$: Observable<User | null> = this.authService.user$;
  featuredRecipes$!: Observable<Recipe[]>;
  followingRecipes$!: Observable<any[]>;
  tip$!: Observable<any>;
  titles$!: Observable<string[]>;

  private allRecipes$!: Observable<Recipe[]>;
  searchTerm$ = new BehaviorSubject<string>('');
  categoryFilter$ = new BehaviorSubject<string>('');

  filteredRecipes$!: Observable<Recipe[]>;
  searchResults$!: Observable<Recipe[]>;
  recipes$!: Observable<Recipe[]>;

  currentUserData: any = null;
  windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  private userSub!: Subscription;
  activeStackIndex = 0;

  categoryStyles: { [key: string]: string } = {
    'tecnica': 'bg-blue-50 border-blue-100 text-blue-800',
    'coccion': 'bg-orange-50 border-orange-100 text-orange-800',
    'sazon': 'bg-green-50 border-green-100 text-green-800',
    'seguridad': 'bg-red-50 border-red-100 text-red-800',
    'general': 'bg-gray-50 border-gray-100 text-gray-800'
  };

  constructor() {
    const recipesCol = collection(this.firestore, 'recipes');

    const featuredQuery = query(recipesCol, orderBy('views', 'desc'), limit(4));
    this.featuredRecipes$ = collectionData(featuredQuery, { idField: 'id' }) as Observable<Recipe[]>;

    const allQuery = query(recipesCol);
    this.allRecipes$ = collectionData(allQuery, { idField: 'id' }) as Observable<Recipe[]>;
    this.recipes$ = this.allRecipes$;

    this.followingRecipes$ = this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        // 🛠️ Usamos runInInjectionContext adentro del switchMap porque es asíncrono
        return runInInjectionContext(this.injector, () => docData(doc(this.firestore, `users/${user.uid}`)));
      }),
      switchMap((userData: any) => {
        const followingIds = userData?.following || [];
        if (followingIds.length === 0) return of([]);

        const limitedIds = followingIds.slice(0, 30);
        const q = query(recipesCol, where('uid', 'in', limitedIds));

        return runInInjectionContext(this.injector, () => collectionData(q, { idField: 'id' })).pipe(
          map((recipes: any[]) => recipes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))
        );
      })
    );

    this.filteredRecipes$ = combineLatest([this.allRecipes$, this.categoryFilter$]).pipe(
      map(([recipes, category]) => {
        if (!recipes) return [];
        if (!category) return recipes;
        return recipes.filter(r => r.category === category);
      })
    );

    this.searchResults$ = combineLatest([this.allRecipes$, this.searchTerm$]).pipe(
      map(([recipes, term]) => {
        if (!recipes) return [];
        const cleanTerm = term.toLowerCase().trim();
        if (!cleanTerm) return [];
        return recipes.filter(r => (r.title && r.title.toLowerCase().includes(cleanTerm)) || (r.category && r.category.toLowerCase().includes(cleanTerm))).slice(0, 5);
      })
    );

    const tipsCol = collection(this.firestore, 'tips');
    const tipsQuery = query(tipsCol);
    this.tip$ = collectionData(tipsQuery, { idField: 'id' }).pipe(
      map(tips => {
        if (!tips || tips.length === 0) return null;
        const index = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
        return tips[index % tips.length];
      })
    );

    this.titles$ = this.featuredRecipes$.pipe(map(recipes => recipes && recipes.length > 0 ? recipes.map(r => r.title) : ['Chefly']));
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.windowWidth = window.innerWidth;
      window.addEventListener('resize', () => { this.windowWidth = window.innerWidth; });
    }

    this.userSub = this.authService.user$.subscribe(user => {
      if (user) {
        this.authService.getUserData(user.uid).subscribe((data: any) => { this.currentUserData = data || { role: 'user' }; });
      } else {
        this.currentUserData = null;
      }
    });
  }

  ngOnDestroy() { if (this.userSub) this.userSub.unsubscribe(); }

  rotateStack(totalRecipes: number) {
    const limit = Math.min(totalRecipes, 5);
    this.activeStackIndex = (this.activeStackIndex + 1) % limit;
  }

  getRandomPhrase(recipeTitle: string): string {
    const phrases = [`Chefly hoy te recomienda comer: ${recipeTitle}`, `¿No se te antoja hoy ${recipeTitle}?`, `Dale un gusto a tu paladar con: ${recipeTitle}`];
    return phrases[recipeTitle ? recipeTitle.length % phrases.length : 0];
  }

  onSearch(event: any) { this.searchTerm$.next(event.target.value); }
  filterByCategory(category: string) { this.categoryFilter$.next(this.categoryFilter$.value === category ? '' : category); }

  getDifficultyStyle(difficulty: string | undefined | null): string {
    if (!difficulty) return 'bg-gray-100 text-gray-800 border-gray-200';
    const diff = difficulty.toLowerCase();
    if (diff.includes('fácil') || diff.includes('facil')) return 'bg-green-100 text-green-800 border-green-200';
    if (diff.includes('intermedio') || diff.includes('media')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  }

  getSavedReaction(tipId: string): string | null { return JSON.parse(localStorage.getItem('reactedTips') || '{}')[tipId] || null; }

  async reactToTip(tipId: string, type: string) {
    if (!this.currentUserData) return this.login();
    const reactedTips = JSON.parse(localStorage.getItem('reactedTips') || '{}');
    if (reactedTips[tipId]) return;
    try {
      await updateDoc(doc(this.firestore, 'tips', tipId), { [`reactions.${type}`]: increment(1) });
      reactedTips[tipId] = type;
      localStorage.setItem('reactedTips', JSON.stringify(reactedTips));
    } catch (e) { console.error(e); }
  }

  async addComment(tipId: string, commentInput: HTMLInputElement) {
    if (!this.currentUserData) return this.login();
    const text = commentInput.value.trim();
    if (!text) return;
    try {
      await updateDoc(doc(this.firestore, 'tips', tipId), { comments: arrayUnion({ userName: this.currentUserData?.displayName || 'Cocinero Chefly', text: text, date: new Date().toISOString() }) });
      commentInput.value = '';
    } catch (e) { console.error(e); }
  }

  async trackView(recipeId: string | undefined) {
    if (!recipeId) return;
    try { await updateDoc(doc(this.firestore, 'recipes', recipeId), { views: increment(1) }); } catch (e) { console.error(e); }
  }

  login() { this.authService.loginWithGoogle(); }
  logout() { this.authService.logout(); }
}
