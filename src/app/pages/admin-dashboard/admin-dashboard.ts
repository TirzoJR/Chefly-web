import { Component, inject, OnInit, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, getCountFromServer, query, collectionData, deleteDoc, doc, updateDoc, orderBy, limit, addDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { RouterLink } from '@angular/router';
import { ChartComponent } from 'ng-apexcharts';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChartComponent],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboardComponent implements OnInit {
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  activeTab: 'dashboard' | 'users' | 'recipes' | 'reports' | 'messages' = 'dashboard';
  isSidebarOpen = true;

  totalUsers = 0;
  activeUsers = 0;
  totalRecipes = 0;
  pendingReports = 0;
  avgRating = 4.6;
  visitsToday = 0;
  totalViews = 0;

  newMessageTitle = '';
  newMessageBody = '';

  reports$!: Observable<any[]>;
  users$!: Observable<any[]>;
  recipes$!: Observable<any[]>;
  messages$!: Observable<any[]>;

  chartOptionsLine: any = null;
  chartOptionsPie: any = null;

  async ngOnInit() {
    await this.loadStats();
    this.loadTables();
  }

  async loadStats() {
    try {
      // 1. 🛠️ DISPARAMOS LAS PETICIONES SINCRÓNICAMENTE EN EL CONTEXTO (Sin usar "await" aquí adentro)
      const usersPromise = runInInjectionContext(this.injector, () => getCountFromServer(collection(this.firestore, 'users')));
      const recipesPromise = runInInjectionContext(this.injector, () => getCountFromServer(collection(this.firestore, 'recipes')));
      const reportsPromise = runInInjectionContext(this.injector, () => getCountFromServer(collection(this.firestore, 'reports')));
      const recipesObs$ = runInInjectionContext(this.injector, () => collectionData(query(collection(this.firestore, 'recipes'))));

      // 2. 🛠️ LAS ESPERAMOS AFUERA DEL CONTEXTO PARA NO ROMPER ANGULAR
      const usersSnap = await usersPromise;
      this.totalUsers = usersSnap.data().count;
      this.activeUsers = Math.floor(this.totalUsers * 0.85);

      const recipesSnap = await recipesPromise;
      this.totalRecipes = recipesSnap.data().count;

      const reportsSnap = await reportsPromise;
      this.pendingReports = reportsSnap.data().count;

      // 3. ARMAMOS LAS GRÁFICAS (Suscripción normal)
      recipesObs$.subscribe((recipes: any[]) => {
        this.totalViews = recipes.reduce((acc, curr) => acc + (curr.views || 0), 0);
        this.visitsToday = Math.floor(this.totalViews * 0.05);

        const categoryCounts: { [key: string]: number } = {};
        recipes.forEach(r => {
          const cat = r.category || 'Otros';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        this.chartOptionsPie = {
          series: Object.values(categoryCounts).length > 0 ? Object.values(categoryCounts) : [1],
          labels: Object.keys(categoryCounts).length > 0 ? Object.keys(categoryCounts) : ['Sin Datos'],
          chart: { type: "donut", height: 350, fontFamily: 'inherit' },
          colors: ['#A78BFA', '#C4B5FD', '#DDD6FE', '#F5D0FE', '#FBCFE8', '#FCE7F3'],
          plotOptions: { pie: { donut: { size: '70%' } } },
          dataLabels: { enabled: false },
          legend: { position: 'bottom' }
        };

        const uData = this.totalUsers > 0 ? [0, Math.floor(this.totalUsers*0.2), Math.floor(this.totalUsers*0.5), Math.floor(this.totalUsers*0.8), this.totalUsers] : [0, 0, 0, 0, 0];
        const rData = this.totalRecipes > 0 ? [0, Math.floor(this.totalRecipes*0.2), Math.floor(this.totalRecipes*0.5), Math.floor(this.totalRecipes*0.8), this.totalRecipes] : [0, 0, 0, 0, 0];

        this.chartOptionsLine = {
          series: [
            { name: "Usuarios", data: uData },
            { name: "Recetas", data: rData }
          ],
          chart: { type: "area", height: 350, toolbar: { show: false }, fontFamily: 'inherit' },
          colors: ['#8B5CF6', '#F97316'],
          dataLabels: { enabled: false },
          stroke: { curve: 'smooth', width: 3 },
          fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
          xaxis: { categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May'] },
          grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
        };
      });
    } catch (error) {
      console.error("Error cargando estadísticas VIP:", error);
    }
  }

  loadTables() {
    runInInjectionContext(this.injector, () => {
      const usersQuery = query(collection(this.firestore, 'users'), limit(50));
      this.users$ = collectionData(usersQuery, { idField: 'uid' }) as Observable<any[]>;

      const recipesQuery = query(collection(this.firestore, 'recipes'), orderBy('views', 'desc'), limit(50));
      this.recipes$ = collectionData(recipesQuery, { idField: 'id' }) as Observable<any[]>;

      const reportsQuery = query(collection(this.firestore, 'reports'));
      this.reports$ = collectionData(reportsQuery, { idField: 'id' }) as Observable<any[]>;

      const messagesQuery = query(collection(this.firestore, 'globalMessages'), orderBy('date', 'desc'));
      this.messages$ = collectionData(messagesQuery, { idField: 'id' }) as Observable<any[]>;
    });
  }

  async sendGlobalMessage() {
    if (!this.newMessageTitle.trim() || !this.newMessageBody.trim()) {
      Swal.fire('Campos vacíos', 'Por favor llena el título y el mensaje.', 'warning');
      return;
    }
    try {
      await addDoc(collection(this.firestore, 'globalMessages'), {
        title: this.newMessageTitle,
        body: this.newMessageBody,
        date: new Date().toISOString(),
        status: 'Enviado'
      });
      Swal.fire('¡Enviado!', 'La notificación ha sido enviada a toda la comunidad.', 'success');
      this.newMessageTitle = '';
      this.newMessageBody = '';
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un problema al enviar el mensaje.', 'error');
    }
  }

  async deleteUser(uid: string, name: string) {
    const res = await Swal.fire({ title: `¿Borrar a ${name}?`, text: "Esto no se puede deshacer", icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
      await deleteDoc(doc(this.firestore, `users/${uid}`));
      Swal.fire('Eliminado', 'Usuario borrado de la base de datos.', 'success');
    }
  }

  async toggleAdminRole(uid: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await updateDoc(doc(this.firestore, `users/${uid}`), { role: newRole });
    Swal.fire('Rol Actualizado', `El usuario ahora es ${newRole}.`, 'success');
  }

  async deleteRecipe(recipeId: string) {
    const res = await Swal.fire({ title: '¿Borrar receta?', text: "Se eliminará para siempre", icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
      await deleteDoc(doc(this.firestore, `recipes/${recipeId}`));
      Swal.fire('Eliminada', 'La receta ha sido borrada.', 'success');
    }
  }

  async deleteReportedRecipe(recipeId: string, reportId: string) {
    const res = await Swal.fire({ title: '¿Borrar receta?', text: "Se eliminará para siempre", icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
      await deleteDoc(doc(this.firestore, `recipes/${recipeId}`));
      await deleteDoc(doc(this.firestore, `reports/${reportId}`));
      Swal.fire('Eliminada', 'La receta ofensiva ha sido borrada.', 'success');
    }
  }

  async ignoreReport(reportId: string) {
    await deleteDoc(doc(this.firestore, `reports/${reportId}`));
  }
}
