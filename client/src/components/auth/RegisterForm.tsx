'use client'

import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { z } from 'zod'

const registerSchema = z.object({
    username: z.string()
        .min(6, 'Username must be at least 6 characters')
        .regex(/^(?=.*[0-9])(?=.*[a-zA-Z])[a-zA-Z0-9_]+$/, 'Username must contain at least one letter and one number'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .regex(/^(?=.*[0-9])(?=.*[a-zA-Z])[a-zA-Z0-9_!@#$%^&*(),.?":{}|<>]+$/, 'Password must contain at least one letter, one number, and may include special characters'),
    email: z.union([
        z.string().email('Invalid email format'),
        z.string().max(0)  // 允许空字符串
    ]).optional()
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
    const { register, loading, error, setShowLoginForm, setShowRegisterForm } = useAuth();
    const [formData, setFormData] = useState<RegisterFormData>({
        username: '',
        password: '',
        email: ''
    });
    const [validationError, setValidationError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const switchToLogin = () => {
        setShowLoginForm(true);
        setShowRegisterForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError('');

        try {
            // 验证表单数据
            registerSchema.parse(formData);

            // 如果 email 是空字符串，则传递 undefined
            const emailToSend = formData.email?.trim() === '' ? undefined : formData.email;
            await register(formData.username, formData.password, emailToSend);
        } catch (error) {
            // 处理验证错误
            if (error instanceof z.ZodError) {
                setValidationError(error.errors[0].message);
                return;
            }

            // 处理其他错误
            console.error('Registration error:', error);
            setValidationError('An unexpected error occurred during registration. Please try again.');
        }
    };

    // 显示的错误信息优先显示表单验证错误，其次是 API 错误
    const displayError = validationError || error;

    return (
        <div className="w-full max-w-md p-6 bg-transparent rounded-lg shadow-xl">
            {displayError && (
                <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded-md" role="alert">
                    {displayError}
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                    <label htmlFor="username" className="block text-white mb-2 font-orbitron font-bold text-xl">
                        Username
                    </label>
                    <input
                        id="username"
                        type="text"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full p-2 bg-transparent text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500 [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white [&:-webkit-autofill_selected]:bg-transparent"
                        disabled={loading}
                        required
                        aria-required="true"
                        aria-invalid={!!displayError}
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="password" className="block text-white mb-2 font-orbitron font-bold text-xl">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-2 bg-transparent text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500 [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white [&:-webkit-autofill_selected]:bg-transparent"
                        disabled={loading}
                        required
                        aria-required="true"
                        aria-invalid={!!displayError}
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="email" className="block text-white mb-2 font-orbitron font-bold text-xl">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-2 bg-transparent text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500 [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white [&:-webkit-autofill_selected]:bg-transparent"
                        disabled={loading}
                        aria-invalid={!!displayError}
                    />
                </div>

                <button
                    type="submit"
                    className="font-orbitron font-bold text-xl w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 hover:bg-white/10 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                    disabled={loading}
                    aria-busy={loading}
                >
                    {loading ? 'Registering...' : 'Register'}
                </button>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={switchToLogin}
                        className="text-blue-400 hover:text-blue-300 font-orbitron text-sm"
                    >
                        Already have an account? Login
                    </button>
                </div>
            </form>
        </div>
    );
}