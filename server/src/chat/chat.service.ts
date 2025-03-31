import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatSession } from './entities/chat_sessions.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat_messages.entity';
import { Repository } from 'typeorm';
import { RedisService } from '../common/services/redis.service';

interface CacheStats {
  hitRate: string;
  hits: number;
  misses: number;
  redisInfo: Record<string, string>;
}

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ChatSession)
    private chatSessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    private readonly redisService: RedisService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  async getChatMessages(
    chatId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    messages: ChatMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    source: 'cache' | 'database';
    queryTime?: number;
  }> {
    const cachedData = await this.redisService.getCachedChatMessages(
      chatId,
      page,
      limit,
    );

    if (cachedData) {
      return {
        ...cachedData,
        source: 'cache' as const,
      };
    }

    const startTime = Date.now();
    const chat = await this.chatSessionRepo.findOne({
      where: { id: chatId },
    });
    if (!chat)
      throw new NotFoundException(`Chat session with ID ${chatId} not found`);
    const skip = (page - 1) * limit;
    const total = await this.chatMessageRepo.count({
      where: { chat },
    });

    const messages = await this.chatMessageRepo.find({
      where: { chat },
      order: { timestamp: 'DESC' },
      skip: skip,
      take: limit,
    });

    const result = {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      source: 'database' as const,
      queryTime: Date.now() - startTime,
    };

    await this.redisService.cacheChatMessages(chatId, page, limit, result);
    await this.redisService.updateChatPopularity(chatId, total);
    return result;
  }

  async chatWithAI(
    chatId: string,
    message: string,
  ): Promise<{
    chatId: string;
    messages: ChatMessage[];
  }> {
    try {
      // check and find chat history
      const chat = await this.chatSessionRepo.findOne({
        where: { id: chatId },
        relations: ['messages'],
      });

      if (!chat)
        throw new NotFoundException(`Chat session with ID ${chatId} not found`);

      // save the message to the Repo
      const userMessage = this.chatMessageRepo.create({
        chat,
        role: 'user',
        content: message,
      });
      await this.chatMessageRepo.save(userMessage);

      // find this.chat All messages
      const messages = await this.chatMessageRepo.find({
        where: { chat },
        order: { timestamp: 'ASC' },
      });

      // format message to regquired openai
      const completion = await this.openai.chat.completions.create({
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        model: 'gpt-4o-mini',
      });

      // store ai response
      const aiMessage = this.chatMessageRepo.create({
        chat: chat,
        role: 'assistant' as const,
        content: completion.choices[0].message.content || '',
      });
      await this.chatMessageRepo.save(aiMessage);
      await this.redisService.invalidateChatCache(chatId);

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

  //--------------testing---------------//
  async getCacheStats(): Promise<CacheStats> {
    const stats = await this.redisService.getCacheStats();
    return stats;
  }
}
