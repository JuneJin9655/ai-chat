'use client'

import React from "react";
import { useAuth } from "@/lib/auth-context";

interface NavbarProps {
    title?: string;
    showLoginButton?: boolean;
    customActions?: React.ReactNode;
    onLoginClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
    title = "Portfolio Blog",
    showLoginButton = true,
    customActions,
    onLoginClick
}) => {
    const { user, logout } = useAuth();

    const handleAuthAction = () => {
        if (user) {
            // 用户已登录，执行登出
            logout();
        } else if (onLoginClick) {
            // 用户未登录，显示登录表单
            onLoginClick();
        }
    };

    return (
        <div className="flex justify-between items-center p-4">
            <div style={{ fontFamily: 'orbitron', fontWeight: '700' }} className="text-4xl text-white">{title}</div>
            <div className="flex items-center gap-4">
                {customActions}
                {showLoginButton && (
                    <button
                        onClick={handleAuthAction}
                        className="bg-transparent border border-white text-white text-xl font-orbitron font-bold hover:bg-white hover:text-black px-4 py-2 rounded-lg transition duration-200"
                    >
                        {user ? 'Logout' : 'Login'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Navbar;