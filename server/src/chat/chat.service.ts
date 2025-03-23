import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class ChatService {
    private openai: OpenAI;

    constructor(
        private readonly configService: ConfigService,
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('openai.apiKey')
        });
    }

    async chatWithAI(message: string) {
        try {
            const completion = await this.openai.chat.completions.create({
                messages: [{ role: "user", content: message }],
                model: "gpt-4o-mini",
            })

            return {
                message: completion.choices[0].message.content,
                usage: completion.usage,
            };
        } catch (error) {
            throw new Error(`Failed to chat with AI: ${error.message}`)
        }
    }
}

