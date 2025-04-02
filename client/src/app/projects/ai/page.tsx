// app/projects/ai/page.tsx
'use client'

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';

export default function AIChatPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6 font-orbitron">AI Chat</h1>
            <ChatInterface />
        </div>
    );
}