export interface Comment {
  uid: string;
  userName: string;
  photoURL: string;
  text: string;
  date: string;
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
  rating: number;
  ratingCount: number;
  views: number;
  ingredients: string[];
  steps: string[];
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  comments?: Comment[];
}