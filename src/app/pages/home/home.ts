import { Component, inject } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf], // ¡IMPORTANTE! Estos permiten procesar los datos de Firebase
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent {
  private firestore = inject(Firestore); // Inyectamos la base de datos
  
  // Creamos el flujo de datos que "escucha" la colección 'recipes'
  recipes$: Observable<any[]> = collectionData(collection(this.firestore, 'recipes'), { idField: 'id' });
}