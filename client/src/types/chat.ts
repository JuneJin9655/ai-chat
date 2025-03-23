export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
}

export interface ChatResponse {
    message: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }
}