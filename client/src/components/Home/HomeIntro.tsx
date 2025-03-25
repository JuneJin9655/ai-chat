'use client'
import React from 'react';
import TypewriterEffect from '@/components/ui/TypewriterEffect';
import { useAuth } from '@/lib/auth-context';

interface HomeIntroProps {
    className?: string;
}

const HomeIntro: React.FC<HomeIntroProps> = ({ className = '' }) => {
    const { user } = useAuth();

    const introLines = [
        user ? `Welcome back, ${user.username}! ✨` : 'Welcome! ✨',
        "Hey there! I am Jun Jin👋",
        "I'm glad you're here.",
        "Feel free to look around and learn more about what I do!",
        "Welcome to my personal space on the web.",
    ];

    const introLinesB = [
        user ? `Welcome back, ${user.username}! ✨` : 'Welcome! ✨',
        "Hey! How's your day going? 😊",
        "I'm so happy you visited my Web again.",
        "Hope your work goes well and life treats you kindly! 🎉✨",
    ];

    return (
        <div className={`text-white w-full max-w-2xl ${className}`}>
            <div className="text-left w-full">
                <TypewriterEffect
                    texts={user ? introLinesB : introLines}
                    typingSpeed={40}
                    delayBetweenLines={800}
                    className="welcome-effect"
                />
            </div>
        </div>
    );
};

export default HomeIntro; 