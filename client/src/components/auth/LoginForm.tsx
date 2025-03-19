'user client'

import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { z } from "zod"
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Link from 'next/link'

const loginSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginFormValue = z.infer<typeof loginSchema>;

export default function LoginForm() {
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, } = useForm<LoginFormValue>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValue) => {
        try {
            setError(null);
            await login(data.username, data.password);
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Login failed. Please check your credentials.'
            );
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                        Username
                    </label>
                    <input
                        id="username"
                        {...register('username')}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        type="text" />
                    {errors.username && (
                        <p className="text-red-500 text-xs italic">{errors.username.message}</p>
                    )}
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
                    <input
                        id="password"
                        {...register('password')}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        type="password"
                    />
                    {errors.password && (
                        <p className="text-red-500 text-xs italic">{errors.password.message}</p>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-sm">
                        Don't have an account?{' '}
                        <Link href="/register" className="text-blue-500 hover:text-blue-700">
                            Register here
                        </Link>
                    </p>
                </div>
            </form>
        </div>
    )
}