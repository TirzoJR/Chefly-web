export interface Comment {
  userName: string;
  text: string;
  date?: any;
}

export interface Recipe {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  difficulty: string;
  prepTime: number;
  servings: number;
  ingredients: string[];
  steps: string[];
  views: number;
  rating: number;       // Promedio real (ej: 4.5)
  ratingCount: number;  // Total de votos (ej: 120)
  
  // 👇 NUEVOS CAMPOS DEL AUTOR
  authorName: string;   // Ej: "María García"
  authorId?: string;    // ID del usuario para ir a su perfil
  authorPhoto?: string; // Foto del autor (opcional)

  comments?: Comment[];
}