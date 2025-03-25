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
    const textsRef = useRef<string[]>(texts);

    useEffect(() => {
        if (JSON.stringify(textsRef.current) !== JSON.stringify(texts)) {
            textsRef.current = texts;
            setDisplayedLines([]);
            setCurrentLine(0);
            setCurrentChar(0);
            setIsTyping(true);
        }
    }, [texts]);

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
        <div className={`w-full ${className}`}>
            {displayedLines.map((line, index) => (
                <div
                    key={index}
                    className={`mt-4 w-full relative ${index === 0 ? 'h-10' : 'h-7'}`}
                >
                    <p className={`whitespace-pre-wrap break-words absolute left-0 font-orbitron ${index === 0
                        ? 'text-3xl font-bold'
                        : 'text-xl'
                        }`}>
                        {line}
                        {index === currentLine && isTyping && (
                            <span className="inline-block ml-1 animate-pulse">|</span>
                        )}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default TypewriterEffect; 