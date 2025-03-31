import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatSession } from './entities/chat_sessions.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat_messages.entity';
import { Repository } from 'typeorm';
import { RedisService } from '../common/services/redis.service';
import { encoding_for_model, Tiktoken } from '@dqbd/tiktoken';

interface CacheStats {
  hitRate: string;
  hits: number;
  misses: number;
  redisInfo: Record<string, string>;
}

@Injectable()
export class ChatService {
  private openai: OpenAI;
  private tokenizer: Tiktoken;

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
    this.tokenizer = encoding_for_model('gpt-4o-mini');
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

      // 使用优化的上下文窗口算法
      const contextMessages = this.getOptimizedContextWindow(messages);

      // format message to required openai
      const completion = await this.openai.chat.completions.create({
        messages: contextMessages.map((msg) => ({
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

  // Stream API
  async chatWithAIStream(chatId: string, message: string) {
    try {
      const chat = await this.chatSessionRepo.findOne({
        where: { id: chatId },
        relations: ['messages'],
      });
      if (!chat) {
        throw new NotFoundException(`Chat session with ID ${chatId} not found`);
      }

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

      const contextMessages = this.getOptimizedContextWindow(messages);

      const stream = await this.openai.chat.completions.create({
        messages: contextMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        model: 'gpt-4o-mini',
        stream: true,
      });

      return {
        stream,
        userMessage,
        chat,
        saveResponse: async (content: string) => {
          const aiMessage = this.chatMessageRepo.create({
            chat,
            role: 'assistant' as const,
            content: content,
          });
          await this.chatMessageRepo.save(aiMessage);
          await this.redisService.invalidateChatCache(chatId);
          return aiMessage;
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to stream chat with AI: ${error.message}`);
      }
      throw new Error('Unknown error occurred');
    }
  }

  private getOptimizedContextWindow(
    messages: ChatMessage[],
    maxTokens = 4000,
  ): ChatMessage[] {
    if (messages.length <= 1) return messages;

    // ✅ 确保 tokenizer 始终可用，防止未初始化
    const countTokens = (text: string): number =>
      this.tokenizer
        ? this.tokenizer.encode(text).length
        : Math.ceil(text.length / 4);

    // 1️⃣ 按时间划分消息
    const latestMsg = messages[messages.length - 1];
    const recentMsgs = messages.slice(
      Math.max(0, messages.length - 10),
      messages.length - 1,
    );
    const olderMsgs = messages.slice(0, Math.max(0, messages.length - 10));

    // 2️⃣ 计算消息权重
    const scoreMessage = (msg: ChatMessage): number => {
      let score = msg.role === 'user' ? 3 : 2;
      score += Math.min(5, countTokens(msg.content) / 200); // ✅ 修正 token 计算
      if (
        /important|key|critical|必须|重要|请记住/.test(
          msg.content.toLowerCase(),
        )
      )
        score += 3;
      if (/\d+\.\s|[-*]\s|```/.test(msg.content)) score += 2;
      return score;
    };

    // 3️⃣ 计算消息的权重，并存入数组
    const scoredRecent = recentMsgs.map((msg) => ({
      msg,
      score: scoreMessage(msg),
    }));
    const scoredOlder = olderMsgs.map((msg) => ({
      msg,
      score: scoreMessage(msg),
    }));

    const result: ChatMessage[] = [latestMsg];
    let tokensUsed = countTokens(latestMsg.content);

    // 4️⃣ 先处理最近的高分消息
    scoredRecent.sort((a, b) => b.score - a.score);
    for (const { msg } of scoredRecent) {
      const msgTokens = countTokens(msg.content);
      if (tokensUsed + msgTokens > maxTokens) break;
      result.push(msg);
      tokensUsed += msgTokens;
    }

    // 5️⃣ 如果仍有空间，添加较早的重要消息
    scoredOlder.sort((a, b) => b.score - a.score);
    for (const { msg } of scoredOlder) {
      const msgTokens = countTokens(msg.content);
      if (tokensUsed + msgTokens > maxTokens) break;
      result.push(msg);
      tokensUsed += msgTokens;
    }

    return result.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }

  //--------------testing---------------//
  async getCacheStats(): Promise<CacheStats> {
    const stats = await this.redisService.getCacheStats();
    return stats;
  }
}
