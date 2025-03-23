'use client'
import React from "react";
import { useCallback, useState, useEffect } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

interface ParticlesBackgroundProps {
    children?: React.ReactNode;
}

const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({ children }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const particlesInit = useCallback(async (engine: any) => {
        await loadSlim(engine);
    }, []);

    if (!isMounted) return null;

    return (
        <div className="relative min-h-screen w-full p-18">
            <div
                className="fixed inset-0 w-full h-full"
                style={{
                    background: 'radial-gradient(ellipse 80% 50% at center, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 20%, rgba(16, 185, 129, 0.1) 40%, transparent 70%), radial-gradient(ellipse 80% 50% at center, #4f46e5 0%, #1e40af 30%, #000000 80% )',
                    zIndex: -2
                }}
            />

            <Particles
                id="tsparticles"
                init={particlesInit}
                options={{
                    background: {
                        color: {
                            value: "transparent",
                        },
                    },
                    fpsLimit: 120,
                    particles: {
                        color: {
                            value: "#ffffff",
                        },
                        links: {
                            color: "#ffffff",
                            distance: 150,
                            enable: false,
                            opacity: 0.5,
                            width: 1,
                        },
                        move: {
                            direction: "none",
                            enable: true,
                            outModes: {
                                default: "bounce",
                            },
                            random: false,
                            speed: 1,
                            straight: false,
                        },
                        number: {
                            density: {
                                enable: true,
                                area: 800,
                            },
                            value: 500,
                        },
                        opacity: {
                            value: 0.5,
                        },
                        shape: {
                            type: "circle",
                        },
                        size: {
                            value: 1.5,
                        },
                    },
                    detectRetina: true,
                    fullScreen: {
                        enable: false,
                        zIndex: -1
                    },
                    interactivity: {
                        events: {
                            onClick: {
                                enable: false,
                                mode: "push",
                            },
                            onHover: {
                                enable: true,
                                mode: "repulse",
                            },
                        },
                        modes: {
                            repulse: {
                                distance: 50,
                                duration: 0.4,
                            },
                        },
                    },
                }}
                className="absolute inset-0 z-0"
            />

            <div className="relative z-10 min-h-screen">
                {children}
            </div>
        </div>
    );
};

export default ParticlesBackground;