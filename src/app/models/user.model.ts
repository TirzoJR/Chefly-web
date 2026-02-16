    export interface UserStats {
    recipesCount: number;
    followersCount: number;
    followingCount: number;
    favoritesCount: number;
    likesReceived: number;
    }

    export interface UserSettings {
    darkMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    notifications: boolean;
    }

    export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    bio: string;
    role: 'user' | 'admin'; // Rol clave para mostrar opciones de admin
    level: 'Novato' | 'Cocinero' | 'Chef' | 'Experto'; // Nivel basado en actividad
    memberSince: Date;
    stats: UserStats;
    badges: string[]; // ['chef-estrella', 'top-contributor', 'foodie']
    settings: UserSettings;
    }