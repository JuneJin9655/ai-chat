'use client'

import React, { useState, useEffect } from 'react';

export default function ContactMe() {
    const [typingText, setTypingText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [skipAnimation, setSkipAnimation] = useState(false);
    const fullText = `Gmail: 
    junjinwk199655@gmail.com
    junjin199655@gmail.com`;

    // 打字效果
    useEffect(() => {
        if (skipAnimation) {
            setTypingText(fullText);
            return;
        }

        if (currentIndex < fullText.length) {
            const typingTimer = setTimeout(() => {
                setTypingText(prevText => prevText + fullText[currentIndex]);
                setCurrentIndex(prevIndex => prevIndex + 1);
            }, 20);

            return () => clearTimeout(typingTimer);
        }
    }, [currentIndex, fullText, skipAnimation]);

    return (
        <div className="w-full max-w-4xl p-6 bg-white/5 backdrop-blur-sm rounded-lg shadow-lg border border-white/20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white font-orbitron">Contact Me</h1>
                {!skipAnimation && currentIndex < fullText.length && (
                    <button
                        onClick={() => setSkipAnimation(true)}
                        className="font-orbitron text-sm font-bold text-white px-3 py-1 rounded bg-transparent hover:bg-white/20 transition"
                    >
                        Skip Animation
                    </button>
                )}
            </div>
            <div className="font-orbitron text-xl font-bold text-white whitespace-pre-wrap">
                {typingText}
                {!skipAnimation && currentIndex < fullText.length && <span className="animate-pulse">|</span>}
            </div>
        </div>
    );
}