'use client'

import React, { useEffect, useState } from "react";

interface TimeDisplayProps {
    showDate?: boolean;
    className?: string;
}

const TimeDisplay: React.FC<TimeDisplayProps> = ({
    showDate = true,
    className = ""
}) => {
    const [currentTime, setCurrentTime] = useState<string>("");

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            let timeString = "";

            if (showDate) {
                timeString = now.toLocaleDateString([], {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }) + ' ';
            }

            timeString += now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            setCurrentTime(timeString);
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, [showDate]);

    return (
        <div className={`text-white font-orbitron font-bold ${className}`}>
            {currentTime}
        </div>
    );
};

export default TimeDisplay; 