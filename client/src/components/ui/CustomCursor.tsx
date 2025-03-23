// components/ui/CustomCursor.tsx
'use client'
import React, { useEffect, useState } from 'react';

const CustomCursor = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isPressed, setIsPressed] = useState(false);

    useEffect(() => {
        const updatePosition = (e: MouseEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseDown = () => {
            setIsPressed(true);
        };

        const handleMouseUp = () => {
            setIsPressed(false);
        };

        window.addEventListener('mousemove', updatePosition);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        window.addEventListener('mouseout', (e) => {
            if (e.relatedTarget === null) {
                setIsPressed(false);
            }
        });

        return () => {
            window.removeEventListener('mousemove', updatePosition);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mouseout', handleMouseUp);
        };
    }, []);

    return (
        <div className="custom-cursor-container">
            <div
                style={{
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    boxShadow: isPressed ? '0 0 15px 5px rgba(255, 255, 255, 0.8)' : '0 0 0px rgba(255, 255, 255, 0.8)',
                    transform: isPressed ? 'scale(1.5)' : 'scale(1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    pointerEvents: 'none',
                    marginLeft: '-6px',
                    marginTop: '-6px',
                    mixBlendMode: 'exclusion'
                }}
            />
        </div>
    );
};

export default CustomCursor;