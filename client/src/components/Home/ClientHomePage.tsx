'use client'

import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/UI/Navbar';
import Sidebar from '@/components/UI/Sidebar';
import HomeIntro from '@/components/Home/HomeIntro';
import LoginForm from '@/components/Auth/LoginForm';
import RegisterForm from '@/components/Auth/RegisterForm';
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