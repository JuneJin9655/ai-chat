'use client'

import { chatApi } from "@/lib/api";
import { ChatMessage } from "@/types/chat"
import { useState, useEffect, useRef } from "react"

interface TypingMessage extends ChatMessage {
    displayedContent?: string;
    isTyping?: boolean;
}

export default function ChatBox() {
    const [messages, setMessages] = useState<TypingMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 滚动到最新消息
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 处理打字效果
    useEffect(() => {
        const typingMessages = messages.filter(msg => msg.role === 'ai' && msg.isTyping);

        if (typingMessages.length === 0) return;

        const currentMessage = typingMessages[0];
        const fullContent = currentMessage.content;
        const currentDisplayed = currentMessage.displayedContent || '';

        if (currentDisplayed.length < fullContent.length) {
            const timer = setTimeout(() => {
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg === currentMessage
                            ? {
                                ...msg,
                                displayedContent: fullContent.substring(0, currentDisplayed.length + 1)
                            }
                            : msg
                    )
                );
            }, 30); // 打字速度，数字越小越快

            return () => clearTimeout(timer);
        } else {
            // 打字完成
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg === currentMessage
                        ? { ...msg, isTyping: false }
                        : msg
                )
            );
        }
    }, [messages]);

    // 当消息更新时滚动到底部
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        try {
            setLoading(true);
            // 添加用户消息
            setMessages(prev => [...prev, { role: 'user', content: input }]);
            const response = await chatApi.sendMessage(input);

            // 添加AI消息，带有打字效果
            setMessages(prev => [...prev, {
                role: 'ai',
                content: response.data.message,
                displayedContent: '',
                isTyping: true
            }]);
            setInput('');
        } catch (error) {
            console.error('chat error ', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white/5 backdrop-blur-sm rounded-lg shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[70%] rounded-lg p-3 ${msg.role === 'user'
                                ? 'bg-transparent text-white text-xl'
                                : 'bg-transparent text-white text-xl'
                                }`}
                        >
                            {msg.role === 'ai' && msg.isTyping
                                ? (msg.displayedContent || '') + (msg.displayedContent?.length === msg.content.length ? '' : '|')
                                : msg.content
                            }
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="border border-white/20 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border border-white/20 rounded text-white"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="text-white px-4 py-2 rounded font-orbitron hover:bg-white/10"
                    >
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
}