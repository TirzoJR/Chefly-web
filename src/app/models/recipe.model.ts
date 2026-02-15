export interface Recipe {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  authorId: string;
  createdAt: any;

  // Campos opcionales para el diseño detallado
  difficulty?: string;    // Para el badge "Intermedio"
  prepTime?: number;      // Para el tiempo "25 min"
  servings?: number;
  ingredients?: string[];
  steps?: string[];
  
  
  rating?: number;        // Ej: 4.5
  ratingCount?: number;   // Ej: 14
  views?: number;         // Ej: 1153
}