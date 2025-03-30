import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: {
      id: string;
    };
  }
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('new')
  async createChat(@Req() req: Request) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('Unauthorized: No user ID found');
    }
    return this.chatService.createNewChat(userId);
  }

  @Get('all')
  async getAllChats(@Req() req: Request) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('Unauthorized: No user ID found');
    }
    return this.chatService.getAllChats(userId);
  }

  @Get(':chatId')
  async getChatById(@Param('chatId') chatId: string) {
    return this.chatService.getChatById(chatId);
  }

  @Post(':chatId')
  async chatWithAI(
    @Param('chatId') chatId: string,
    @Body() body: { message?: string },
  ) {
    if (!body.message) {
      throw new Error('Message content is required');
    }
    return this.chatService.chatWithAI(chatId, body.message);
  }
}
