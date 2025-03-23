import { ReactNode } from "react";
import TimeDisplay from "./TimeDisplay";

interface RoundedContainerProps {
    children: ReactNode;
    label?: string;
    showTime?: boolean;
}

const RoundedContainer = ({
    children,
    label,
    showTime = true
}: RoundedContainerProps) => {
    return (
        <div className="min-h-screen flex items-center justify-center m-3">
            <div
                className="
          rounded-[2rem] 
          overflow-visible
          w-full 
          max-w-7xl 
          relative 
          border border-white/20
          shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]
          bg-white/5 backdrop-blur-sm
          p-6
          pt-10
        "
                style={{
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                }}
            >
                {label && (
                    <div
                        className="
              absolute -top-4 left-8
              bg-transparent text-white px-6 py-1.5
              font-orbitron text-sm font-bold
              z-10  
            "
                    >
                        {label}
                    </div>
                )}

                {showTime && (
                    <div className="absolute bottom-8 right-8 z-10">
                        <TimeDisplay className="text-lg opacity-80" />
                    </div>
                )}

                {children}
            </div>
        </div>
    )
}

export default RoundedContainer