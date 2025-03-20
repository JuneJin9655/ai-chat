'use client'

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation";
import { useEffect } from "react"

export default function DashboardPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }
    return (
        <div className="container mx-auto p-6">
            <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <button
                        onClick={() => logout()}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Logout
                    </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h2 className="text-lg font-semibold mb-4">Welcome, {user.username}!</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="block text-gray-500">ID</span>
                            <span>{user.id}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500">Role</span>
                            <span className="capitalize">{user.role}</span>
                        </div>
                        {user.email && (
                            <div>
                                <span className="block text-gray-500">Email</span>
                                <span>{user.email}</span>
                            </div>
                        )}
                        <div>
                            <span className="block text-gray-500">Created Time</span>
                            <span>{new Date(user.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}