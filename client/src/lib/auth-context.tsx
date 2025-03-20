'use client'

import { User } from "@/types/auth"
import { useRouter } from "next/navigation";
import { createContext, ReactNode, useEffect, useState, useContext } from "react";
import { authApi } from "./api";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, email?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null)
    const router = useRouter();


    useEffect(() => {
        const checkAuth = async () => {
            try {
                const userData = await authApi.getProfile();
                setUser(userData);
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = async (username: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await authApi.login({ username, password });
            const userData = await authApi.getProfile();
            setUser(userData);
            router.push('/dashboard');
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.response?.data?.data?.message || 'Login Failed, Please try again';
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const register = async (username: string, password: string, email?: string) => {
        setLoading(true);
        setError(null);
        try {
            await authApi.register({ username, password, email });
            await login(username, password);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || '注册失败，请稍后再试';
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authApi.logout();
            setUser(null);
            router.push('/login');
        } catch (error) {
            console.error('Logout error: ', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}