import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatSession } from './entities/chat_sessions.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat_messages.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ChatSession)
    private chatSessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  async chatWithAI(chatId: string, message: string) {
    try {
      const chat = await this.chatSessionRepo.findOne({
        where: { id: chatId },
        relations: ['messages'],
      });

      if (!chat) throw new Error('Chat session not Found');

      const userMessage = this.chatMessageRepo.create({
        chat,
        role: 'user',
        content: message,
      });
      await this.chatMessageRepo.save(userMessage);

      const messages = await this.chatMessageRepo.find({
        where: { chat },
        order: { timestamp: 'ASC' },
      });

      const completion = await this.openai.chat.completions.create({
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        model: 'gpt-4o-mini',
      });

      const aiMessage = this.chatMessageRepo.create({
        chat: chat,
        role: 'assistant' as const,
        content: completion.choices[0].message.content || '',
      });
      await this.chatMessageRepo.save(aiMessage);

      return {
        chatId,
        messages: [...messages, userMessage, aiMessage],
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to chat with AI: ${error.message}`);
      }
      throw new Error('Unknown error occurred');
    }
  }

  async getAllChats(userId: string): Promise<ChatSession[]> {
    return this.chatSessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['messages'],
    });
  }

  async createNewChat(userId: string): Promise<ChatSession> {
    const newChat = this.chatSessionRepo.create({
      userId,
      title: `New Chat ${new Date().toLocaleDateString()}`,
      messages: [],
    });
    return this.chatSessionRepo.save(newChat);
  }

  async getChatById(chatId: string): Promise<ChatSession | null> {
    return this.chatSessionRepo.findOne({
      where: { id: chatId },
      relations: ['messages'],
    });
  }
}
