'use client'

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import { z } from 'zod'

const registerSchema = z.object({
    username: z.string()
        .min(6, 'Username must be at least 6 characters')
        .regex(/^(?=.*[0-9])(?=.*[a-zA-Z])[a-zA-Z0-9_]+$/, 'Username must contain at least one letter and one number'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .regex(/^(?=.*[0-9])(?=.*[a-zA-Z])[a-zA-Z0-9_]+$/, 'Password must contain at least one letter and one number'),
    email: z.union([
        z.string().email('Invalid email format'),
        z.string().max(0)  // 允许空字符串
    ]).optional()
})

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
    const { register, loading, error, setShowLoginForm, setShowRegisterForm } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [validationError, setValidationError] = useState('');
    const [isValid, setIsValid] = useState(false);

    // 实时验证表单
    useEffect(() => {
        const validateForm = () => {
            try {
                registerSchema.parse({ username, password, email });
                setValidationError('');
                setIsValid(true);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    setValidationError(error.errors[0].message);
                    setIsValid(false);
                }
            }
        };

        validateForm();
    }, [username, password, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValid) {
            return;
        }

        try {
            // 如果 email 是空字符串，则传递 undefined
            const emailToSend = email.trim() === '' ? undefined : email;
            await register(username, password, emailToSend);
        } catch (error) {
            // 处理其他错误（比如网络错误）
            console.error('Registration error:', error);
        }
    };

    const switchToLogin = () => {
        setShowLoginForm(true);
        setShowRegisterForm(false);
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

                <div className="mb-6">
                    <label className="block text-white mb-2 font-orbitron font-bold text-xl">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 bg-transparent text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500 [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white [&:-webkit-autofill_selected]:bg-transparent"
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    className="font-orbitron font-bold text-xl w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 hover:bg-white/10 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                    disabled={loading || !isValid}
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