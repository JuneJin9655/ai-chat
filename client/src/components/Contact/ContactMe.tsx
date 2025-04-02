'use client'

import React from 'react';
import TypewriterEffect from '@/components/ui/TypewriterEffect';
import { useAuth } from '@/lib/auth-context';

export default function ContactMe() {
    const { user } = useAuth();

    const contactLines = [
        user ? `Contact me, ${user.username}! ✨` : 'Contact me! ✨',
        "You can reach me via:",
        "Gmail:",
        "junjinwk199655@gmail.com",
        "junjin199655@gmail.com",
        "Thanks for visiting my website! 🚀"
    ];

    return (
        <div className="text-white w-full max-w-2xl">
            <div className="text-left w-full">
                <TypewriterEffect
                    texts={contactLines}
                    typingSpeed={40}
                    delayBetweenLines={800}
                    className="welcome-effect"
                />
            </div>
        </div>
    );
}