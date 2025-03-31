import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import type { ChatSession } from './entities/chat_sessions.entity';
import { AuthGuard } from '@nestjs/passport';
import { ChatMessageDto } from './dto/chat.dto';
import type { Request, Response as ExpressResponse } from 'express';

// 声明Express请求对象中的用户属性
declare module 'express' {
  interface Request {
    user?: {
      id: string;
    };
  }
}

// 添加接口定义
interface ChatMessagesResponse {
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  source: 'cache' | 'database';
  queryTime?: number;
}

interface ChatWithAIResponse {
  chatId: string;
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
}

interface CacheStats {
  hitRate: string;
  hits: number;
  misses: number;
  redisInfo: Record<string, string>;
}

@Controller('chat')
@UseGuards(AuthGuard('jwt')) // Protect all routes with JWT authentication
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':chatId/messages')
  async getChatMessages(
    @Param('chatId') chatId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<ChatMessagesResponse> {
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (
      Number.isNaN(pageNum) ||
      Number.isNaN(limitNum) ||
      pageNum < 1 ||
      limitNum < 1
    ) {
      throw new BadRequestException('Page and limit must be positive numbers');
    }

    const result = (await this.chatService.getChatMessages(
      chatId,
      pageNum,
      limitNum,
    )) as ChatMessagesResponse;
    return result;
  }

  @Post('new')
  async createChat(@Req() req: Request): Promise<ChatSession> {
    const userId = req.user?.id;
    if (!userId)
      throw new UnauthorizedException('Unauthorized: No user ID found');
    const chat: ChatSession = await this.chatService.createNewChat(userId);
    return chat;
  }

  @Get('all')
  async getAllChats(@Req() req: Request): Promise<ChatSession[]> {
    const userId = req.user?.id;
    if (!userId)
      throw new UnauthorizedException('Unauthorized: No user ID found');
    const chats: ChatSession[] = await this.chatService.getAllChats(userId);
    return chats;
  }

  @Get(':chatId')
  async getChatById(
    @Param('chatId') chatId: string,
  ): Promise<ChatSession | null> {
    const chat: ChatSession | null = await this.chatService.getChatById(chatId);
    return chat;
  }

  @Post(':chatId/message')
  async chatWithAI(
    @Param('chatId') chatId: string,
    @Body() body: ChatMessageDto,
  ): Promise<ChatWithAIResponse> {
    if (!body.message.trim()) {
      throw new BadRequestException('Message content is required');
    }
    const response = (await this.chatService.chatWithAI(
      chatId,
      body.message,
    )) as ChatWithAIResponse;
    return response;
  }

  @Get('stats/cache')
  async getCacheStats(): Promise<CacheStats> {
    const stats =
      (await this.chatService.getCacheStats()) as unknown as CacheStats;
    return stats;
  }

  @Post(':chatId/stream')
  async chatWithAIStream(
    @Param('chatId') chatId: string,
    @Body() body: ChatMessageDto,
    @Res() response: ExpressResponse,
  ) {
    if (!body.message.trim()) {
      throw new BadRequestException('Message content is required');
    }

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    try {
      const { stream, saveResponse } = await this.chatService.chatWithAIStream(
        chatId,
        body.message,
      );

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          response.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      await saveResponse(fullContent);
      response.write('data: [DONE]\n\n');
      response.end();
    } catch (error) {
      // 确保错误时关闭连接
      if (!response.headersSent) {
        response.status(500).json({
          error: 'Error processing stream',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        response.write(
          `data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`,
        );
        response.end();
      }
    }
  }
}
