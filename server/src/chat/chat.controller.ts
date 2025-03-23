import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post()
    async chat(@Body() body: { message: string }) {
        return this.chatService.chatWithAI(body.message);
    }
}
