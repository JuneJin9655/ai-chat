'use client'

import { chatApi } from "@/lib/api";
import { ChatMessage, ChatSession } from "@/types/chat"
import { useState, useEffect, useRef } from "react"

interface TypingMessage extends ChatMessage {
    displayedContent?: string;
    isTyping?: boolean;
}

interface ChatBoxProps {
    session: ChatSession | null;
    onMessageSent?: () => void;
}

export default function ChatBox({ session, onMessageSent }: ChatBoxProps) {
    const [messages, setMessages] = useState<TypingMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 加载会话消息
    useEffect(() => {
        if (!session || !session.id) {
            setMessages([]);
            return;
        }

        const loadMessages = async () => {
            try {
                setLoadingMessages(true);
                setError(null);
                const response = await chatApi.getChatMessages(session.id);

                // 确保每条消息都有唯一ID
                if (response && response.messages && Array.isArray(response.messages)) {
                    const messagesWithUniqueIds = response.messages.map((msg, index) => {
                        if (!msg.id) {
                            return { ...msg, id: `server-msg-${index}-${Date.now()}` };
                        }
                        return msg;
                    });
                    setMessages(messagesWithUniqueIds.reverse());
                } else {
                    setMessages([]);
                }
            } catch (error) {
                setError('Failed to load messages');
                setMessages([]);
            } finally {
                setLoadingMessages(false);
            }
        };
        loadMessages();
    }, [session]);

    // 滚动到最新消息
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 处理打字效果
    useEffect(() => {
        const typingMessages = messages.filter(msg => msg.role === 'assistant' && msg.isTyping);
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
            }, 30); // 打字速度

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

    // 生成唯一ID
    const generateUniqueId = () => {
        return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    };

    // 处理消息发送
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading || !session) return;

        try {
            setLoading(true);
            setError(null);

            // 创建用户消息
            const userMsg: TypingMessage = {
                id: generateUniqueId(),
                role: 'user',
                content: input,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, userMsg]);
            setInput('');

            // 创建AI消息占位符
            const aiMsgId = generateUniqueId();
            const aiMsg: TypingMessage = {
                id: aiMsgId,
                role: 'assistant',
                content: '',
                displayedContent: '',
                isTyping: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);

            try {
                // 对于新会话，先使用普通API确保有历史
                if (messages.length === 0) {
                    await chatApi.sendChatMessage(session.id, input).catch(() => {
                        // 即使普通API失败，也继续尝试流式API
                    });
                }

                // 使用流式API
                await chatApi.streamChatMessage(
                    session.id,
                    input,
                    // 处理数据块
                    (chunk) => {
                        setMessages(prev => prev.map(msg =>
                            msg.id === aiMsgId
                                ? { ...msg, content: msg.content + chunk }
                                : msg
                        ));
                    },
                    // 完成回调
                    () => {
                        setMessages(prev => prev.map(msg =>
                            msg.id === aiMsgId
                                ? { ...msg, isTyping: false }
                                : msg
                        ));
                        if (onMessageSent) onMessageSent();
                    },
                    // 错误处理
                    (error) => {
                        // 流式API失败时，尝试普通API
                        chatApi.sendChatMessage(session.id, input).then(response => {
                            const aiResponse = response.messages?.find(m => m.role === 'assistant');
                            if (aiResponse) {
                                setMessages(prev => prev.map(msg =>
                                    msg.id === aiMsgId
                                        ? { ...msg, content: aiResponse.content, isTyping: false }
                                        : msg
                                ));
                            }
                        }).catch(() => {
                            // 两种API都失败
                            setMessages(prev => prev.map(msg =>
                                msg.id === aiMsgId
                                    ? { ...msg, content: '消息发送失败，请重试', isTyping: false }
                                    : msg
                            ));
                            setError('Failed to send message');
                        });
                    }
                );
            } catch (apiError) {
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId
                        ? { ...msg, content: '发送消息出错，请重试', isTyping: false }
                        : msg
                ));
                setError('Failed to send message');
            }
        } catch (error) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    // 渲染无会话状态
    if (!session) {
        return (
            <div className="flex flex-col h-[600px] items-center justify-center bg-white/5 backdrop-blur-sm rounded-lg shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20">
                <div className="text-white text-center p-8">
                    <h3 className="text-xl mb-4">No Chat Session Selected</h3>
                    <p>Please select a chat session or create a new one to start chatting.</p>
                </div>
            </div>
        );
    }

    // 主要UI渲染
    return (
        <div className="flex flex-col h-[600px] bg-white/5 backdrop-blur-sm rounded-lg shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20">
            <div className="p-3 border-b border-white/20">
                <h3 className="text-white font-medium truncate font-orbitron">{session.title}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                    <div className="text-white text-center">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-white/70 text-center py-8">
                        No messages yet. Start a conversation!
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={`${index}-${msg.id || 'no-id'}`}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg p-3 ${msg.role === 'user'
                                    ? 'bg-transparent text-white text-xl'
                                    : 'bg-transparent text-white text-xl'
                                    }`}
                            >
                                {msg.role === 'assistant' && msg.isTyping
                                    ? (msg.displayedContent || '') + (msg.displayedContent?.length === msg.content.length ? '' : '|')
                                    : msg.content
                                }
                            </div>
                        </div>
                    ))
                )}
                {error && (
                    <div className="text-red-500 text-center py-2">{error}</div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-white/20 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border border-white/20 rounded text-white"
                        disabled={loading || loadingMessages}
                    />
                    <button
                        type="submit"
                        disabled={loading || loadingMessages || !input.trim()}
                        className="text-white px-4 py-2 rounded font-orbitron hover:bg-white/10"
                    >
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
}