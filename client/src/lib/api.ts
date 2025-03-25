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
