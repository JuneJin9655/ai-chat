'use client'
import React, { useState, useEffect, useRef } from 'react';

interface TypewriterEffectProps {
    texts: string[];
    typingSpeed?: number;
    delayBetweenLines?: number;
    className?: string;
}

const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
    texts,
    typingSpeed = 50,
    delayBetweenLines = 500,
    className = ""
}) => {
    const [displayedLines, setDisplayedLines] = useState<string[]>([]);
    const [currentLine, setCurrentLine] = useState(0);
    const [currentChar, setCurrentChar] = useState(0);
    const [isTyping, setIsTyping] = useState(true);
    const [skipAnimation, setSkipAnimation] = useState(false);
    const mountedRef = useRef(true);
    const textsRef = useRef<string[]>(texts);

    // 处理跳过动画
    const handleSkipAnimation = () => {
        setSkipAnimation(true);
        setDisplayedLines([...texts]);
        setCurrentLine(texts.length);
        setIsTyping(false);
    };

    useEffect(() => {
        if (JSON.stringify(textsRef.current) !== JSON.stringify(texts)) {
            textsRef.current = texts;
            setDisplayedLines([]);
            setCurrentLine(0);
            setCurrentChar(0);
            setIsTyping(true);
            setSkipAnimation(false);
        }
    }, [texts]);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (skipAnimation || currentLine >= texts.length) {
            return;
        }

        let timer: NodeJS.Timeout;

        if (isTyping) {
            if (currentChar < texts[currentLine].length) {
                timer = setTimeout(() => {
                    if (!mountedRef.current) return;

                    setDisplayedLines(prev => {
                        const newLines = [...prev];
                        if (newLines.length <= currentLine) {
                            newLines.push("");
                        }
                        newLines[currentLine] = texts[currentLine].substring(0, currentChar + 1);
                        return newLines;
                    });
                    setCurrentChar(prev => prev + 1);
                }, typingSpeed);
            } else {
                timer = setTimeout(() => {
                    if (!mountedRef.current) return;

                    setIsTyping(false);
                    setCurrentLine(prev => prev + 1);
                    setCurrentChar(0);
                    setIsTyping(true);
                }, delayBetweenLines);
            }
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [currentLine, currentChar, isTyping, texts, typingSpeed, delayBetweenLines, skipAnimation]);

    return (
        <div className={`w-full ${className}`}>
            <div className="flex justify-between items-center mb-6">
                {!skipAnimation && currentLine < texts.length && (
                    <button
                        onClick={handleSkipAnimation}
                        className="text-sm font-bold font-orbitron text-white/80 px-3 py-1 rounded bg-transparent hover:bg-white/20 transition border border-white"
                    >
                        Skip Animation
                    </button>
                )}
                <div></div> {/* 空div用于保持两边对齐 */}
            </div>
            {displayedLines.map((line, index) => (
                <div
                    key={index}
                    className={`mb-6 sm:mb-8 w-full relative ${index === 0 ? 'min-h-[3rem]' : 'min-h-[2.5rem]'}`}
                >
                    <p className={`whitespace-pre-wrap break-words ${index === 0
                        ? 'text-2xl sm:text-3xl font-bold'
                        : 'text-lg sm:text-xl'
                        }`}>
                        {line}
                        {index === currentLine && isTyping && !skipAnimation && (
                            <span className="inline-block ml-1 animate-pulse">|</span>
                        )}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default TypewriterEffect; 