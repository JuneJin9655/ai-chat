export interface User {
    id: number;
    username: string;
    email?: string;
    role: 'user' | 'admin';
    createdAt: string;
    updatedAt: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterCredentials {
    username: string;
    email?: string;
    password: string;
}

export interface AUthResponse {
    access_token: string;
    refresh_token: string;
}