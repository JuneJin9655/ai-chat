'use client'

import { AUthResponse, LoginCredentials, RegisterCredentials, User } from "@/types/auth";
import { CacheStats, ChatMessagesResponse, ChatSession, ChatWithAIResponse } from "@/types/chat";
import axios from "axios";

interface FailedQueueItem {
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
}

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
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
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
            !originalRequest.url.includes('/auth/refresh')) {

            if (isRefreshing) {
                // 如果已经在刷新，将请求加入队列
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
        return response.data?.data || response.data;
    },

    // 注册方法
    register: async (credentials: RegisterCredentials): Promise<User> => {
        const response = await api.post('/auth/register', credentials);
        return response.data?.data || response.data;
    },

    // 获取用户配置文件
    getProfile: async (): Promise<User> => {
        const response = await api.get('/auth/profile');
        return response.data?.data || response.data;
    },

    // 退出登录
    logout: async (): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await api.post('/auth/logout');

            // 清除本地存储的令牌或用户状态（如果有）
            localStorage.removeItem('user');

            // 清除API实例的授权头
            if (api.defaults.headers.common['Authorization']) {
                delete api.defaults.headers.common['Authorization'];
            }

            return {
                success: true,
                message: response.data?.message || 'Logged out successfully'
            };
        } catch (error) {
            console.error('Logout failed:', error);
            return {
                success: false,
                message: 'Failed to logout. Please try again.'
            };
        }
    },

    // 刷新token
    refreshToken: async (): Promise<AUthResponse> => {
        const response = await api.post('/auth/refresh');
        return response.data?.data || response.data;
    }
};

// 聊天相关API方法
export const chatApi = {
    createChat: async (): Promise<ChatSession> => {
        try {
            const response = await api.post('/chat/new');
            const sessionData = response.data.data || response.data;

            if (!sessionData || !sessionData.id) {
                throw new Error('Invalid session data returned from server');
            }

            return sessionData;
        } catch (error) {
            console.error('创建聊天会话失败:', error);
            throw error;
        }
    },

    getAllChats: async (): Promise<ChatSession[]> => {
        const response = await api.get('/chat/all');

        // 确保返回数组
        if (Array.isArray(response.data)) {
            return response.data;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
            return response.data.data;
        } else {
            return [];
        }
    },

    getChatById: async (chatId: string): Promise<ChatSession | null> => {
        const response = await api.get(`/chat/${chatId}`);
        return response.data?.data || response.data;
    },

    getChatMessages: async (chatId: string, page: number = 1, limit: number = 20): Promise<ChatMessagesResponse> => {
        try {
            const response = await api.get(`/chat/${chatId}/messages`, {
                params: { page, limit }
            });

            // 处理响应数据
            if (response.data && typeof response.data === 'object') {
                const messageData = response.data.data || response.data;
                if (!messageData.messages) {
                    messageData.messages = [];
                }
                return messageData;
            } else {
                return {
                    messages: [],
                    pagination: {
                        page, limit, total: 0, totalPages: 0
                    },
                    source: 'database'
                };
            }
        } catch (error) {
            console.error('获取聊天消息失败:', error);
            throw error;
        }
    },

    sendChatMessage: async (chatId: string, message: string): Promise<ChatWithAIResponse> => {
        try {
            const payload = { message };
            const response = await api.post(`/chat/${chatId}/message`, payload);
            return response.data?.data || response.data;
        } catch (error: any) {
            console.error('发送消息失败:', error.response?.data || error.message);
            throw error;
        }
    },

    deleteChat: async (chatId: string): Promise<{ success: boolean }> => {
        try {
            const response = await api.delete(`/chat/${chatId}`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error('Failed to delete chat session:', error);
            throw error;
        }
    },

    streamChatMessage: async (
        chatId: string,
        message: string,
        onChunk: (chunk: string) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void> => {
        try {
            // 请求头
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // 添加认证头
            if (api.defaults.headers.common['Authorization']) {
                headers['Authorization'] = api.defaults.headers.common['Authorization'] as string;
            }

            // 发送请求
            const response = await fetch(`${API_URL}/chat/${chatId}/stream`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ message }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Stream request failed with status ${response.status}`);
            }

            // 处理流式响应
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Stream reader not available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            const processStream = async () => {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        onComplete();
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.substring(6);

                            if (data === '[DONE]') {
                                onComplete();
                                return;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.content) {
                                    onChunk(parsed.content);
                                }
                                if (parsed.error) {
                                    onError(new Error(parsed.error));
                                    return;
                                }
                            } catch (e) {
                                console.error('解析 SSE 数据错误:', e);
                            }
                        }
                    }
                }
            };

            await processStream();
        } catch (error) {
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    },

    getCacheStats: async (): Promise<CacheStats> => {
        const response = await api.get('/chat/stats/cache');
        return response.data?.data || response.data;
    }
};
