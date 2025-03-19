'use client'

import { AUthResponse, LoginCredentials, RegisterCredentials, User } from "@/types/auth";
import axios from "axios"

declare module 'axios' {
    interface AxiosRequestConfig {
        _retry?: boolean;
    }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: any) => void }[] = [];

const processQueue = (error: any, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (!originalRequest || !originalRequest.url) {
            return Promise.reject(error);
        }

        if (error.response && error.response.status === 401 && !originalRequest._retry &&
            originalRequest.url !== '/auth/refresh' && originalRequest.url !== '/auth/login') {
            console.log('Token过期,尝试刷新...');
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        return api(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });

            }
            originalRequest._retry = true;
            isRefreshing = true;
            try {
                await authApi.refreshToken();
                processQueue(null);
                isRefreshing = false;

                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                isRefreshing = false;

                if (typeof window !== 'undefined') {
                    if (!window.location.pathname.includes('/login')) {
                        sessionStorage.setItem('auth_redirect', 'true');
                        window.location.href = '/login?redirected=true';
                    }
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: async (Credential: LoginCredentials): Promise<AUthResponse> => {
        const response = await api.post('/auth/login', Credential);
        return response.data.data;
    },

    register: async (Credential: RegisterCredentials): Promise<User> => {
        const response = await api.post('/auth/register', Credential);
        return response.data.data;
    },

    getProfile: async (): Promise<User> => {
        const response = await api.get('/auth/profile');
        return response.data.data;
    },

    logout: async (): Promise<void> => {
        await api.post('/auth/logout');
    },

    refreshToken: async (): Promise<void> => {
        const response = await api.post('/auth/refresh');
        console.log('刷新响应:', response.data);
        console.log('当前cookies:', document.cookie);
    }
}