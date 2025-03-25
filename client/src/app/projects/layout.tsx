import Sidebar from '@/components/ui/Sidebar';
import { ReactNode } from 'react';

export default function ProjectLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-[calc(100vh-80px)]">
            <Sidebar />
            <div className="flex-1 p-4 overflow-auto">
                {children}
            </div>
        </div>
    );
}