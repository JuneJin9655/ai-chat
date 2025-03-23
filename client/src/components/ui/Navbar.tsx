'use client'

import Link from "next/link";
import React from "react";

interface NavbarProps {
    title?: string;
    showLoginButton?: boolean;
    customActions?: React.ReactNode;
}

const Navbar: React.FC<NavbarProps> = ({
    title = "Portfolio Blog",
    showLoginButton = true,
    customActions
}) => {
    return (
        <div className="flex justify-between items-center p-4">
            <div style={{ fontFamily: 'orbitron', fontWeight: '700' }} className="text-4xl text-white">{title}</div>
            <div className="flex items-center gap-4">
                {customActions}
                {showLoginButton && (
                    <Link href="/login">
                        <button className="bg-transparent border border-white text-white text-xl font-orbitron font-bold hover:bg-white hover:text-black px-4 py-2 rounded-lg transition duration-200">
                            Login
                        </button>
                    </Link>
                )}
            </div>
        </div>
    );
};

export default Navbar;