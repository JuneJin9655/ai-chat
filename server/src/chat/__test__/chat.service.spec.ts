import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../chat.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatSession } from '../entities/chat_sessions.entity';
import { ChatMessage } from '../entities/chat_messages.entity';
import OpenAI from 'openai';
import { RedisService } from '../../common/services/redis.service';

jest.mock('openai');

describe('ChatService', () => {
  let service: ChatService;
  let mockCreateCompletion: jest.Mock;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('fake-api-key'),
  };

  const mockChatSessionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockChatMessageRepo = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockRedisService = {
    redis: {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    },
    cacheChatMessages: jest.fn(),
    getCachedChatMessages: jest.fn(),
    invalidateChatCache: jest.fn(),
    updateChatPopularity: jest.fn(),
  };

  beforeEach(async () => {
    // Mock OpenAI API
    mockCreateCompletion = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'AI response' } }],
    });
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreateCompletion } },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(ChatSession),
          useValue: mockChatSessionRepo,
        },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockChatMessageRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-03-30T04:30:40.074Z'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chatWithAI', () => {
    const mockChatId = 'test-chat-id';
    const mockMessage = 'Hello AI';
    const mockDate = '2025-03-30T04:30:40.074Z';
    const mockChat = {
      id: mockChatId,
      userId: 'test-user-id',
      messages: [],
      createdAt: new Date(mockDate),
    } as ChatSession;
    const mockUserMessage = {
      id: '1',
      chat: mockChat,
      role: 'user',
      content: mockMessage,
      timestamp: new Date(mockDate),
    } as ChatMessage;
    const mockAIMessage = {
      id: '2',
      chat: mockChat,
      role: 'assistant',
      content: 'AI response',
      timestamp: new Date(mockDate),
    } as ChatMessage;

    beforeEach(() => {
      mockChatSessionRepo.findOne.mockResolvedValue(mockChat);
      let messageCounter = 0;
      mockChatMessageRepo.create.mockImplementation(
        (data: Partial<ChatMessage>): ChatMessage => ({
          id: data.id || String(++messageCounter),
          chat: data.chat || mockChat,
          role: data.role || 'user',
          content: data.content || '',
          timestamp: data.timestamp || new Date(mockDate),
        }),
      );
      mockChatMessageRepo.save
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAIMessage);
      mockChatMessageRepo.find.mockResolvedValue([]);

      // 重置 Redis 模拟
      mockRedisService.invalidateChatCache.mockResolvedValue(undefined);
    });

    it('should process chat message and return response', async () => {
      const result = await service.chatWithAI(mockChatId, mockMessage);

      expect(mockChatSessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockChatId },
        relations: ['messages'],
      });
      expect(mockChatMessageRepo.create).toHaveBeenCalledTimes(2);
      expect(mockChatMessageRepo.save).toHaveBeenCalledTimes(2);
      expect(mockCreateCompletion).toHaveBeenCalled();

      // 验证缓存失效处理
      expect(mockRedisService.invalidateChatCache).toHaveBeenCalledWith(
        mockChatId,
      );

      expect(result).toEqual({
        chatId: mockChatId,
        messages: [mockUserMessage, mockAIMessage],
      });
    });

    it('should throw error if OpenAI API call fails', async () => {
      mockCreateCompletion.mockRejectedValue(new Error('OpenAI API Error'));

      await expect(service.chatWithAI(mockChatId, mockMessage)).rejects.toThrow(
        'Failed to chat with AI: OpenAI API Error',
      );
    });

    it('should throw error if chat session not found', async () => {
      mockChatSessionRepo.findOne.mockResolvedValue(null);

      await expect(service.chatWithAI(mockChatId, mockMessage)).rejects.toThrow(
        `Failed to chat with AI: Chat session with ID ${mockChatId} not found`,
      );
    });
  });

  describe('getAllChats', () => {
    const mockUserId = 'test-user-id';
    const mockChats = [
      { id: '1', userId: mockUserId, messages: [], createdAt: new Date() },
      { id: '2', userId: mockUserId, messages: [], createdAt: new Date() },
    ] as ChatSession[];

    it('should return all chats for user', async () => {
      mockChatSessionRepo.find.mockResolvedValue(mockChats);

      const result = await service.getAllChats(mockUserId);

      expect(mockChatSessionRepo.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        relations: ['messages'],
      });
      expect(result).toEqual(mockChats);
    });

    it('should return empty array when no chats exist', async () => {
      mockChatSessionRepo.find.mockResolvedValue([]);

      const result = await service.getAllChats(mockUserId);

      expect(mockChatSessionRepo.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('createNewChat', () => {
    const mockUserId = 'test-user-id';
    const mockNewChat = {
      userId: mockUserId,
      title: 'New Chat 3/30/2025',
      messages: [],
      createdAt: new Date(),
      id: '1',
    } as ChatSession;

    it('should create new chat session', async () => {
      mockChatSessionRepo.create.mockReturnValue(mockNewChat);
      mockChatSessionRepo.save.mockResolvedValue({ ...mockNewChat, id: '1' });

      const result = await service.createNewChat(mockUserId);

      expect(mockChatSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          title: expect.stringContaining('New Chat') as unknown as string,
          messages: [],
        }),
      );
      expect(mockChatSessionRepo.save).toHaveBeenCalledWith(mockNewChat);
      expect(result).toEqual({ ...mockNewChat, id: '1' });
    });
  });

  describe('getChatById', () => {
    const mockChatId = 'test-chat-id';
    const mockChat = {
      id: mockChatId,
      userId: 'test-user-id',
      messages: [],
      createdAt: new Date(),
    } as ChatSession;

    it('should return chat by id', async () => {
      mockChatSessionRepo.findOne.mockResolvedValue(mockChat);

      const result = await service.getChatById(mockChatId);

      expect(mockChatSessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockChatId },
        relations: ['messages'],
      });
      expect(result).toEqual(mockChat);
    });

    it('should return null if chat not found', async () => {
      mockChatSessionRepo.findOne.mockResolvedValue(null);

      const result = await service.getChatById(mockChatId);

      expect(result).toBeNull();
    });
  });
});
