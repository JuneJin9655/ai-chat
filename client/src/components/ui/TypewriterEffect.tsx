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
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (currentLine >= texts.length) {
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
    }, [currentLine, currentChar, isTyping, texts, typingSpeed, delayBetweenLines]);

    return (
        <div className={`text-left ${className}`}>
            {displayedLines.map((line, index) => (
                <p key={index} className="mt-4 font-orbitron text-xl">
                    {line}
                    {/* 只在当前正在输入的行末尾显示光标 */}
                    {index === currentLine && isTyping && (
                        <span className="ml-1 animate-pulse">|</span>
                    )}
                </p>
            ))}
        </div>
    );
};

export default TypewriterEffect; 