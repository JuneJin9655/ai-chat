'use client'

import { AUthResponse, LoginCredentials, RegisterCredentials, User } from "@/types/auth";
import axios from "axios";

// API基础URL，从环境变量获取或使用默认值
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// 创建axios实例
export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // 启用跨域请求时发送cookie
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
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
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // 如果错误是401并且不是刷新token的请求，且没有尝试过重试
        if (error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/auth/refresh-token')) {

            if (isRefreshing) {
                // 如果已经在刷新，将请求加入队列
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        return api(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // 调用刷新token的API
                const response = await authApi.refreshToken();

                // 成功刷新后处理队列中的请求
                processQueue(null, response.access_token);

                // 重试原始请求
                return api(originalRequest);
            } catch (refreshError) {
                // 刷新失败，处理队列并返回登录页
                processQueue(refreshError, null);

                // 可以在这里清除用户状态并重定向到登录页
                // 例如：store.dispatch(logout());

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// 认证相关API方法
export const authApi = {
    // 登录方法
    login: async (credentials: LoginCredentials): Promise<AUthResponse> => {
        const response = await api.post('/auth/login', credentials);
        return response.data.data;
    },

    // 注册方法
    register: async (credentials: RegisterCredentials): Promise<User> => {
        const response = await api.post('/auth/register', credentials);
        return response.data.data;
    },

    // 获取用户配置文件
    getProfile: async (): Promise<User> => {
        const response = await api.get('/auth/profile');
        return response.data.data;
    },

    // 退出登录
    logout: async (): Promise<void> => {
        await api.post('/auth/logout');
    },

    // 刷新token
    refreshToken: async (): Promise<AUthResponse> => {
        const response = await api.post('/auth/refresh');
        return response.data.data;
    }
};

// 聊天相关API方法
export const chatApi = {
    // 发送消息
    sendMessage: async (message: string): Promise<any> => {
        const response = await api.post('/chat', { message });
        return response.data;
    }
};
