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
        .regex(/^[a-zA-Z0-9_!@#$%^&*(),.?":{}|<>]+$/, 'Password may contain letters, numbers, and special characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
    const { login, loading, error, setShowLoginForm, setShowRegisterForm } = useAuth();
    const [formData, setFormData] = useState<LoginFormData>({
        username: '',
        password: ''
    });
    const [validationError, setValidationError] = useState('');
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const switchToRegister = () => {
        setShowLoginForm(false);
        setShowRegisterForm(true);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError('');

        try {
            loginSchema.parse(formData);

            await login(formData.username, formData.password);

            const redirectPath = localStorage.getItem('loginRedirect');
            if (redirectPath) {
                localStorage.removeItem('loginRedirect');
                router.push(redirectPath);
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                setValidationError(error.errors[0].message);
                return;
            }

            console.error('Login error:', error);
            setValidationError('An unexpected error occurred. Please try again.');
        }
    };

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

                <button
                    type="submit"
                    className="font-orbitron font-bold text-xl w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 hover:bg-white/10 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                    disabled={loading}
                    aria-busy={loading}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={switchToRegister}
                        className="text-blue-400 hover:text-blue-300 font-orbitron text-sm"
                    >
                        Don&apos;t have an account? Register
                    </button>
                </div>
            </form>
        </div>
    );
} 