'use client'

import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import HomeIntro from '@/components/Home/HomeIntro';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ClientHomePage() {
    const { showLoginForm, showRegisterForm, setShowLoginForm } = useAuth();
    const searchParams = useSearchParams();

    useEffect(() => {
        const showLogin = searchParams.get('showLogin');
        const redirect = searchParams.get('redirect');

        if (showLogin === 'true') {
            setShowLoginForm(true);

            // 可以将redirect参数保存到本地存储，以便登录成功后重定向
            if (redirect) {
                localStorage.setItem('loginRedirect', redirect);
            }
        }
    }, [searchParams, setShowLoginForm]);

    // 创建一个只显示登录表单的函数，而不是切换
    const toggleLoginFormOnly = () => {
        setShowLoginForm(!showLoginForm); // 切换登录表单的显示/隐藏状态
    };

    return (
        <>
            <Navbar onLoginClick={toggleLoginFormOnly} />
            <div className="flex min-h-[calc(100vh-80px)] flex-col md:flex-row">
                <Sidebar />
                <div className="flex-1 flex justify-center mt-6 md:mt-24 pr-4 md:pr-34 relative">
                    {showLoginForm ? (
                        <LoginForm />
                    ) : showRegisterForm ? (
                        <RegisterForm />
                    ) : (
                        <div className="w-full max-w-3xl px-4 pb-20">
                            <HomeIntro />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 