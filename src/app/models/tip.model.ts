export interface Tip {
  id?: string;
  text: string;
  date: string; // Formato YYYY-MM-DD para identificar el día
  reactions: {
    love: number;
    like: number;
    wow: number;
  };
  comments: TipComment[];
}

export interface TipComment {
  userName: string;
  text: string;
  date: any;
}