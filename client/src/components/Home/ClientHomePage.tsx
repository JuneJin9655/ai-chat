'use client'

import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import HomeIntro from '@/components/Home/HomeIntro';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';

export default function ClientHomePage() {
    const { showLoginForm, toggleLoginForm, showRegisterForm } = useAuth();

    return (
        <>
            <Navbar onLoginClick={toggleLoginForm} />
            <div className="flex h-[calc(100vh-80px)]">
                <Sidebar />
                <div className="flex-1 flex justify-center mt-24 pr-34 relative">
                    {showLoginForm ? (
                        <LoginForm />
                    ) : showRegisterForm ? (
                        <RegisterForm />
                    ) : (
                        <div className="w-full max-w-3xl px-4">
                            <HomeIntro />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 