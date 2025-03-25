'use client'

import React from 'react';
import ContactMe from '@/components/Contact/ContactMe';
import RoundedContainer from '@/components/UI/RoundedContainer';
import Navbar from '@/components/UI/Navbar';
import Sidebar from '@/components/UI/Sidebar';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import LoginForm from '@/components/Auth/LoginForm';
import RegisterForm from '@/components/Auth/RegisterForm';

export default function ContactPage() {
    const { showLoginForm, showRegisterForm, setShowLoginForm } = useAuth();

    // 创建一个只显示登录表单的函数，而不是切换
    const toggleLoginFormOnly = () => {
        setShowLoginForm(!showLoginForm); // 切换登录表单的显示/隐藏状态
    };

    return (
        <RoundedContainer label='Contact Me'>
            <Suspense fallback={<div>Loading...</div>}>
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
                                <ContactMe />
                            </div>
                        )}
                    </div>
                </div>
            </Suspense>
        </RoundedContainer>
    );
}