'use client'

import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

const loginSchema = z.object({
    username: z.string()
        .min(6, 'Username must be at least 6 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers, and underscores'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Password must contain only letters, numbers, and underscores'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
    const { login, loading, error, setShowLoginForm, setShowRegisterForm } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [validationError, setValidationError] = useState('');
    const router = useRouter();

    const switchToRegister = () => {
        setShowLoginForm(false);
        setShowRegisterForm(true);
    }

    const validateForm = (): boolean => {
        try {
            loginSchema.parse({ username, password });
            setValidationError('');
            return true;
        } catch (error) {
            if (error instanceof z.ZodError) {
                setValidationError(error.errors[0].message);
            }
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError('');  // 重置验证错误

        try {
            // 使用 Zod 验证表单
            loginSchema.parse({ username, password });
            // 验证通过，调用登录
            await login(username, password);

            // 检查是否有保存的重定向路径
            const redirectPath = localStorage.getItem('loginRedirect');
            if (redirectPath) {
                localStorage.removeItem('loginRedirect'); // 清除已使用的路径
                router.push(redirectPath); // 重定向到之前尝试访问的页面
            }
        } catch (error) {
            // 如果是验证错误，显示验证错误信息
            if (error instanceof z.ZodError) {
                setValidationError(error.errors[0].message);
                return;  // 验证失败，直接返回
            }
            // 其他错误继续抛出
            throw error;
        }
    };

    return (
        <div className="w-full max-w-md p-6 bg-transparent rounded-lg shadow-xl">
            {(error || validationError) && (
                <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded-md">
                    {validationError || error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-white mb-2 font-orbitron font-bold text-xl">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-2 bg-transparent text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500 [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white [&:-webkit-autofill_selected]:bg-transparent"
                        disabled={loading}
                        required
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-white mb-2 font-orbitron font-bold text-xl">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 bg-transparent text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500 [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white [&:-webkit-autofill_selected]:bg-transparent"
                        disabled={loading}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="font-orbitron font-bold text-xl w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 hover:bg-white/10 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                    disabled={loading}
                >
                    {loading ? 'Login...' : 'Login'}
                </button>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={switchToRegister}
                        className="text-blue-400 hover:text-blue-300 font-orbitron text-sm"
                    >
                        Don't have an account? Register
                    </button>
                </div>
            </form>
        </div>
    );
} 