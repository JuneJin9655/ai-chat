'use client'
import React from 'react';
import TypewriterEffect from '@/components/ui/TypewriterEffect';

interface HomeIntroProps {
    className?: string;
}

const HomeIntro: React.FC<HomeIntroProps> = ({ className = '' }) => {
    const introLines = [
        "Hey there! 👋",
        "I'm glad you're here.",
        "Feel free to look around and learn more about what I do!",
        "Welcome to my personal space on the web.",
    ];
    return (
        <div className={`text-white ${className}`}>
            <h1 className="text-3xl font-orbitron mb-6">Welcome</h1>
            <TypewriterEffect
                texts={introLines}
                typingSpeed={40}
                delayBetweenLines={800}
            />
        </div>
    );
};

export default HomeIntro; 