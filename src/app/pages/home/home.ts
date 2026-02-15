import { Component, inject } from '@angular/core';
import { Firestore, collection, collectionData, query } from '@angular/fire/firestore'; // <--- 1. AQUÍ AGREGAMOS 'query'
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent {
  private firestore = inject(Firestore);
  

  recipes$: Observable<any[]> = collectionData(
    query(collection(this.firestore, 'recipes')), 
    { idField: 'id' }
  );
}