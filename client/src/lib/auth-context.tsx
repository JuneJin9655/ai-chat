'use client'

import { User } from "@/types/auth";
import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { authApi } from "./api";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    showLoginForm: boolean;
    showRegisterForm: boolean;
    setShowLoginForm: (show: boolean) => void;
    setShowRegisterForm: (show: boolean) => void;
    toggleLoginForm: () => void;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, email?: string) => Promise<void>;
    logout: () => Promise<void>;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [showRegisterForm, setShowRegisterForm] = useState(false);

    // 当错误信息更新时，设置定时器自动清除
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 2000); // 2秒后自动清除错误信息

            return () => clearTimeout(timer); // 清理定时器
        }
    }, [error]);

    // 初始化时检查用户状态
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const userData = await authApi.getProfile();
                setUser(userData);
            } catch (err) {
                // 如果请求失败，用户未登录
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const toggleLoginForm = () => {
        setShowLoginForm(prev => !prev);
        setError(null); // 清除之前的错误信息
    };

    const login = async (username: string, password: string) => {
        setLoading(true);
        setError(null);

        try {
            // 调用登录API
            await authApi.login({ username, password });

            // 登录成功后获取用户信息
            const userData = await authApi.getProfile();
            setUser(userData);
            setShowLoginForm(false); // 登录成功后隐藏表单
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.response?.data?.error?.message || 'Login failed, please try again');
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authApi.logout();
            setUser(null);
            setShowLoginForm(false); // 确保登出时关闭登录表单
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setLoading(false);
        }
    };

    const register = async (username: string, password: string, email?: string) => {
        setLoading(true);
        setError(null);

        try {
            await authApi.register({
                username,
                password,
                ...(email ? { email } : {})
            });
            // 注册成功后切换到登录表单
            setShowRegisterForm(false);
            setShowLoginForm(true);
        } catch (err: any) {
            console.error('Register error:', err);
            setError(err.response?.data?.error?.message || 'Registration failed, please try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            showLoginForm,
            showRegisterForm,
            setShowLoginForm,
            setShowRegisterForm,
            toggleLoginForm,
            login,
            register,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}