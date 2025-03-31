import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './entities/chat_sessions.entity';
import { ChatMessage } from './entities/chat_messages.entity';
import { RedisService } from '../common/services/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatSession, ChatMessage])],
  controllers: [ChatController],
  providers: [ChatService, RedisService],
})
export class ChatModule {}
