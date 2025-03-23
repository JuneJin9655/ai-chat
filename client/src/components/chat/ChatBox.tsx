'use client'

import { chatApi } from "@/lib/api";
import { ChatMessage, ChatResponse } from "@/types/chat"
import { useState } from "react"

export default function ChatBox() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        try {
            setLoading(true);
            setMessages(prev => [...prev, { role: 'user', content: input }]);
            const response = await chatApi.sendMessage(input);

            setMessages(prev => [...prev, {
                role: 'ai',
                content: response.data.message
            }]);
            setInput('');
        } catch (error) {
            console.error('chat error ', error);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-md">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[70%] rounded-lg p-3 ${msg.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-800'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="border-t p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border rounded"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
                    >
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
}