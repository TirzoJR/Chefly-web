export interface Recipe {
  id?: string;
  title: string;
  description: string;
  image: string;
  category: string;
  authorId: string;
  createdAt: number;
}