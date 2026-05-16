import { Component, inject, OnInit } from '@angular/core';
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

  // Variables de UI (Agregamos la pestaña 'messages')
  activeTab: 'dashboard' | 'users' | 'recipes' | 'reports' | 'messages' = 'dashboard';
  isSidebarOpen = true;

  // Estadísticas Globales
  totalUsers = 0;
  activeUsers = 0;
  totalRecipes = 0;
  pendingReports = 0;
  avgRating = 4.6;
  visitsToday = 0;
  totalViews = 0;

  // Variables para Mensajes Globales
  newMessageTitle = '';
  newMessageBody = '';

  // Observables para las tablas
  reports$!: Observable<any[]>;
  users$!: Observable<any[]>;
  recipes$!: Observable<any[]>;
  messages$!: Observable<any[]>; // 👈 Para el historial de mensajes

  // Variables para las gráficas
  chartOptionsLine: any;
  chartOptionsPie: any;

  async ngOnInit() {
    this.setupCharts();
    await this.loadStats();
    this.loadTables();
  }

  async loadStats() {
    try {
      const usersSnap = await getCountFromServer(collection(this.firestore, 'users'));
      this.totalUsers = usersSnap.data().count;
      this.activeUsers = Math.floor(this.totalUsers * 0.85);

      const recipesSnap = await getCountFromServer(collection(this.firestore, 'recipes'));
      this.totalRecipes = recipesSnap.data().count;

      const reportsSnap = await getCountFromServer(collection(this.firestore, 'reports'));
      this.pendingReports = reportsSnap.data().count;

      const recipesQuery = query(collection(this.firestore, 'recipes'));
      collectionData(recipesQuery).subscribe((recipes: any[]) => {
        this.totalViews = recipes.reduce((acc, curr) => acc + (curr.views || 0), 0);
        this.visitsToday = Math.floor(this.totalViews * 0.05);

        const mockUsers = [120, 250, 400, 650, 890, this.totalUsers];
        const mockRecipes = [50, 120, 300, 500, 800, this.totalRecipes];

        this.chartOptionsLine = {
          ...this.chartOptionsLine,
          series: [
            { name: "Usuarios", data: mockUsers },
            { name: "Recetas", data: mockRecipes }
          ]
        };
      });

    } catch (error) {
      console.error("Error cargando estadísticas VIP:", error);
    }
  }

  loadTables() {
    // 1. Usuarios
    const usersQuery = query(collection(this.firestore, 'users'), limit(50));
    this.users$ = collectionData(usersQuery, { idField: 'uid' }) as Observable<any[]>;

    // 2. Recetas
    const recipesQuery = query(collection(this.firestore, 'recipes'), orderBy('views', 'desc'), limit(50));
    this.recipes$ = collectionData(recipesQuery, { idField: 'id' }) as Observable<any[]>;

    // 3. Reportes
    const reportsQuery = query(collection(this.firestore, 'reports'));
    this.reports$ = collectionData(reportsQuery, { idField: 'id' }) as Observable<any[]>;

    // 4. Mensajes Globales
    const messagesQuery = query(collection(this.firestore, 'globalMessages'), orderBy('date', 'desc'));
    this.messages$ = collectionData(messagesQuery, { idField: 'id' }) as Observable<any[]>;
  }

  // --- MÉTODOS DE MENSAJES GLOBALES ---
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

  // --- MÉTODOS DE USUARIOS ---
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

  // --- MÉTODOS DE RECETAS Y REPORTES ---
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

  // --- CONFIGURACIÓN DE LAS GRÁFICAS (ApexCharts) ---
  setupCharts() {
    this.chartOptionsLine = {
      series: [{ name: "Usuarios", data: [0,0,0,0,0,0] }, { name: "Recetas", data: [0,0,0,0,0,0] }],
      chart: { type: "area", height: 350, toolbar: { show: false }, fontFamily: 'inherit' },
      colors: ['#8B5CF6', '#F97316'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
      xaxis: { categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'] },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
    };

    this.chartOptionsPie = {
      series: [26, 21, 19, 15, 11, 8],
      chart: { type: "donut", height: 350, fontFamily: 'inherit' },
      labels: ['Comida', 'Cena', 'Postre', 'Desayuno', 'Bebida', 'Snack'],
      colors: ['#A78BFA', '#C4B5FD', '#DDD6FE', '#F5D0FE', '#FBCFE8', '#FCE7F3'],
      plotOptions: { pie: { donut: { size: '70%' } } },
      dataLabels: { enabled: false },
      legend: { position: 'bottom' }
    };
  }
}
