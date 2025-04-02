'use client'

import React from 'react';
import AboutMe from '@/components/About/AboutMe';
import RoundedContainer from '@/components/ui/RoundedContainer';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';

export default function AboutPage() {
    const { showLoginForm, showRegisterForm, setShowLoginForm } = useAuth();

    // 创建一个只显示登录表单的函数，而不是切换
    const toggleLoginFormOnly = () => {
        setShowLoginForm(!showLoginForm); // 切换登录表单的显示/隐藏状态
    };

    return (
        <RoundedContainer label='About Me'>
            <Suspense fallback={<div>Loading...</div>}>
                <Navbar onLoginClick={toggleLoginFormOnly} />
                <div className="flex min-h-[calc(100vh-120px)] flex-col md:flex-row">
                    <Sidebar />
                    <div className="flex-1 flex justify-center mt-6 md:mt-24 pr-4 md:pr-34 relative">
                        {showLoginForm ? (
                            <LoginForm />
                        ) : showRegisterForm ? (
                            <RegisterForm />
                        ) : (
                            <div className="w-full max-w-3xl px-4 pb-20">
                                <AboutMe />
                            </div>
                        )}
                    </div>
                </div>
            </Suspense>
        </RoundedContainer>
    );
}