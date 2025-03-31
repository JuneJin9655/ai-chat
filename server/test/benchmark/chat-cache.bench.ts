import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../../src/chat/chat.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ChatSession } from '../../src/chat/entities/chat_sessions.entity';
import { ChatMessage } from '../../src/chat/entities/chat_messages.entity';
import { RedisService } from '../../src/common/services/redis.service';
import configuration from '../../src/config/configuration';
import { v4 as uuidv4 } from 'uuid'; // 确保先安装: npm install uuid

describe('Chat Performance Benchmark', () => {
  let module: TestingModule;
  let chatService: ChatService;
  let testChatId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            url: configService.get('DATABASE_URL'),
            autoLoadEntities: true,
            synchronize: true,
          }),
        }),
        TypeOrmModule.forFeature([ChatSession, ChatMessage]),
        RedisModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'single',
            url:
              configService.get<string>('REDIS_URL') ||
              'redis://localhost:6379',
            password: configService.get<string>('REDIS_PASSWORD') || '',
            db: configService.get<number>('REDIS_DB') || 0,
          }),
        }),
      ],
      providers: [ChatService, RedisService],
    }).compile();

    chatService = module.get<ChatService>(ChatService);

    // 创建一个测试聊天会话并获取其ID
    try {
      // 使用有效的UUID格式
      testChatId = uuidv4();

      // 先尝试创建一个聊天会话
      const createdChat = await chatService.createNewChat('test-user-id');
      testChatId = createdChat.id; // 使用实际创建的会话ID

      console.log('Created test chat with ID:', testChatId);
    } catch (error) {
      console.error('Failed to create test chat:', error);
    }
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should benchmark chat message retrieval', async () => {
    expect(testChatId).toBeDefined();

    // 第一次查询（从数据库）
    console.time('First Query (DB)');
    const firstResult = await chatService.getChatMessages(testChatId, 1, 20);
    console.timeEnd('First Query (DB)');
    console.log('First Query Result:', firstResult);

    // 第二次查询（应该从缓存）
    console.time('Second Query (Cache)');
    const secondResult = await chatService.getChatMessages(testChatId, 1, 20);
    console.timeEnd('Second Query (Cache)');
    console.log('Second Query Result:', secondResult);

    // 验证结果
    expect(firstResult).toBeDefined();
    expect(secondResult).toBeDefined();
  }, 30000);
});
