'use client'

import React from 'react';
import TypewriterEffect from '@/components/ui/TypewriterEffect';
import { useAuth } from '@/lib/auth-context';

export default function AboutMe() {
    const { user } = useAuth();

    const aboutMeLines = [
        user ? `Hi, ${user.username}! 👋` : 'Hi there! 👋 ',
        "I'm a Computer Science Master's graduate from NJIT, passionate about full-stack development.",
        "I've been exploring Three.js to add 3D elements to my projects.",
        "My tech stack includes Node.js, Next.js, NestJS, React, Tailwind CSS, Redis, Docker and so on",
        "I'm continuously learning and improving my skills by building applications.",
        "I enjoy tackling technical challenges and keeping up with the latest trends in web development.",
        "Outside of coding, I love gaming and playing soccer! ⚽🎮",
        "Looking forward to sharing my journey and learning from others along the way! 🚀",
    ];

    return (
        <div className="text-white w-full max-w-2xl">
            <div className="text-left w-full">
                <TypewriterEffect
                    texts={aboutMeLines}
                    typingSpeed={40}
                    delayBetweenLines={800}
                    className="welcome-effect"
                />
            </div>
        </div>
    );
}