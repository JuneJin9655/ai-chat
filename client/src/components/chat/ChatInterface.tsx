// components/chat/ChatInterface.tsx
'use client'

import { useState, useEffect } from 'react';
import { ChatSession } from '@/types/chat';
import { chatApi } from '@/lib/api';
import SessionList from './SessionList';
import ChatBox from './ChatBox';

export default function ChatInterface() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    // 加载所有会话
    const loadSessions = async () => {
        try {
            setLoading(true);
            const allSessions = await chatApi.getAllChats();
            setSessions(allSessions);

            // 如果没有选中的会话但有会话列表，选择第一个
            if (!selectedSession && allSessions.length > 0) {
                setSelectedSession(allSessions[0]);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    // 初始加载会话
    useEffect(() => {
        loadSessions();
    }, []);

    // 选择会话
    const handleSelectSession = (session: ChatSession) => {
        setSelectedSession(session);
    };

    // 创建新会话
    const handleCreateSession = async () => {
        try {
            setIsCreating(true);
            const newSession = await chatApi.createChat();

            if (newSession && newSession.id) {
                // 添加到会话列表
                setSessions(prev => [newSession, ...prev]);
                // 选择新创建的会话
                setSelectedSession(newSession);
            }
        } catch (error) {
            console.error('Failed to create new chat session:', error);
        } finally {
            setIsCreating(false);
        }
    };

    // 删除会话
    const handleSessionDeleted = (deletedSessionId: string) => {
        // 从会话列表中移除
        setSessions(prev => prev.filter(s => s.id !== deletedSessionId));

        // 如果删除的是当前选中的会话，重置选择
        if (selectedSession?.id === deletedSessionId) {
            const remainingSessions = sessions.filter(s => s.id !== deletedSessionId);
            setSelectedSession(remainingSessions.length > 0 ? remainingSessions[0] : null);
        }
    };

    return (
        <div className="flex w-full h-[600px] gap-4">
            <div className="w-1/4 h-full min-w-[250px] max-w-[300px]">
                {loading && sessions.length === 0 ? (
                    <div className="h-full flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-lg">
                        <div className="text-white">Loading Chat Session...</div>
                    </div>
                ) : (
                    <SessionList
                        sessions={sessions}
                        activeSession={selectedSession}
                        onSelectSession={handleSelectSession}
                        onCreateNewChat={handleCreateSession}
                        onSessionDeleted={handleSessionDeleted}
                    />
                )}
            </div>
            <div className="flex-1">
                <ChatBox
                    session={selectedSession}
                    onMessageSent={loadSessions} // 发送消息后刷新会话列表（更新标题等）
                />
            </div>
        </div>
    );
}