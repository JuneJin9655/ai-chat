export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    messages: ChatMessage[];
}

export interface ChatMessagesResponse {
    messages: ChatMessage[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    source: 'cache' | 'database';
    queryTime?: number;
}

export interface ChatWithAIResponse {
    chatId: string;
    messages: ChatMessage[];
}

export interface CacheStats {
    hitRate: string;
    hits: number;
    misses: number;
    redisInfo: Record<string, string>;
}

// Deprecated interface - keeping for backward compatibility
export interface ChatResponse {
    message: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }
}