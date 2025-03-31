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
    mockCreateCompletion = jest
      .fn()
      .mockImplementation((params: { stream?: boolean }) => {
        // 返回流式或非流式响应
        if (params.stream) {
          // 流式响应模拟
          const mockStream = async function* () {
            // 添加await表达式，避免lint警告
            await Promise.resolve();
            yield { choices: [{ delta: { content: 'Hello' } }] };
            yield { choices: [{ delta: { content: ' World' } }] };
          };
          return mockStream();
        } else {
          // 非流式响应模拟
          return Promise.resolve({
            choices: [{ message: { content: 'AI response' } }],
          });
        }
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

  describe('chatWithAIStream', () => {
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
      content: '', // 初始为空，将在流中累积
      timestamp: new Date(mockDate),
    } as ChatMessage;

    beforeEach(() => {
      mockChatSessionRepo.findOne.mockResolvedValue(mockChat);
      mockChatMessageRepo.create.mockImplementation(
        (data: Partial<ChatMessage>): ChatMessage => ({
          id: data.id || `msg-${Math.random().toString(36).substr(2, 9)}`,
          chat: data.chat || mockChat,
          role: data.role || 'user',
          content: data.content || '',
          timestamp: data.timestamp || new Date(mockDate),
        }),
      );

      // 保存用户消息和初始 AI 消息
      mockChatMessageRepo.save
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce({ ...mockAIMessage });

      mockChatMessageRepo.find.mockResolvedValue([]);

      // ✅ 确保 Redis 模拟清空缓存
      mockRedisService.invalidateChatCache.mockResolvedValue(undefined);
    });

    it('should process streaming chat message and return proper response objects', async () => {
      const getOptimizedContextWindowSpy = jest
        .spyOn(service as any, 'getOptimizedContextWindow')
        .mockReturnValue([mockUserMessage]);

      const { stream, saveResponse } = await service.chatWithAIStream(
        mockChatId,
        mockMessage,
      );

      expect(mockChatSessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockChatId },
        relations: ['messages'],
      });

      expect(getOptimizedContextWindowSpy).toHaveBeenCalled();

      expect(mockChatMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chat: mockChat,
          role: 'user',
          content: mockMessage,
        }),
      );

      expect(mockChatMessageRepo.create).toHaveBeenCalledTimes(1);
      expect(mockChatMessageRepo.save).toHaveBeenCalledTimes(1);

      expect(mockCreateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({ stream: true }),
      );

      expect(mockRedisService.invalidateChatCache).not.toHaveBeenCalled();

      expect(stream).toBeDefined();
      expect(saveResponse).toBeDefined();
      expect(typeof saveResponse).toBe('function');

      // ✅ 测试 `saveResponse` 功能
      mockChatMessageRepo.save.mockClear();
      mockRedisService.invalidateChatCache.mockClear();
      await saveResponse('Hello World');
      expect(mockChatMessageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: 'Hello World',
        }),
      );
      expect(mockRedisService.invalidateChatCache).toHaveBeenCalledWith(
        mockChatId,
      );

      getOptimizedContextWindowSpy.mockRestore();
    });

    it('should throw error if OpenAI API call fails', async () => {
      mockCreateCompletion.mockRejectedValueOnce(new Error('OpenAI API Error'));

      await expect(
        service.chatWithAIStream(mockChatId, mockMessage),
      ).rejects.toThrow('Failed to stream chat with AI: OpenAI API Error');
    });

    it('should throw error if chat session not found', async () => {
      mockChatSessionRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.chatWithAIStream(mockChatId, mockMessage),
      ).rejects.toThrow(
        `Failed to stream chat with AI: Chat session with ID ${mockChatId} not found`,
      );
    });

    it('should handle streaming content correctly', async () => {
      const { stream } = await service.chatWithAIStream(
        mockChatId,
        mockMessage,
      );

      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk.choices[0]?.delta?.content || '';
      }

      expect(fullContent).toBe('Hello World');
    });
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
      // 添加spy来验证getOptimizedContextWindow的调用
      const getOptimizedContextWindowSpy = jest
        .spyOn(service as any, 'getOptimizedContextWindow')
        .mockReturnValue([mockUserMessage]);

      const result = await service.chatWithAI(mockChatId, mockMessage);

      expect(mockChatSessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockChatId },
        relations: ['messages'],
      });
      expect(mockChatMessageRepo.create).toHaveBeenCalledTimes(2);
      expect(mockChatMessageRepo.save).toHaveBeenCalledTimes(2);

      // 验证使用了优化上下文窗口
      expect(getOptimizedContextWindowSpy).toHaveBeenCalled();

      expect(mockCreateCompletion).toHaveBeenCalled();
      expect(mockRedisService.invalidateChatCache).toHaveBeenCalledWith(
        mockChatId,
      );
      expect(result).toEqual({
        chatId: mockChatId,
        messages: [mockUserMessage, mockAIMessage],
      });

      // 清理spy
      getOptimizedContextWindowSpy.mockRestore();
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

  describe('chatWithAIStream', () => {
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
      content: '', // 初始为空，将在流中累积
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

      // 保存用户消息和初始的AI消息
      mockChatMessageRepo.save
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce({ ...mockAIMessage });

      mockChatMessageRepo.find.mockResolvedValue([]);

      // 重置 Redis 模拟
      mockRedisService.invalidateChatCache.mockResolvedValue(undefined);
    });

    it('should process streaming chat message and return proper response objects', async () => {
      // 添加spy来验证getOptimizedContextWindow的调用
      const getOptimizedContextWindowSpy = jest
        .spyOn(service as any, 'getOptimizedContextWindow')
        .mockReturnValue([mockUserMessage]);

      const { stream, saveResponse } = await service.chatWithAIStream(
        mockChatId,
        mockMessage,
      );

      expect(mockChatSessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockChatId },
        relations: ['messages'],
      });

      // 验证使用了优化上下文窗口
      expect(getOptimizedContextWindowSpy).toHaveBeenCalled();

      // 验证用户消息创建和保存
      expect(mockChatMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chat: mockChat,
          role: 'user',
          content: mockMessage,
        }),
      );

      // 验证AI消息创建（在service.ts实现中没有创建初始AI消息，所以移除此断言）
      // 只验证创建了一次消息
      expect(mockChatMessageRepo.create).toHaveBeenCalledTimes(1);

      expect(mockChatMessageRepo.save).toHaveBeenCalledTimes(1);

      // 验证OpenAI API调用
      expect(mockCreateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        }),
      );

      // 在流式响应阶段不应调用缓存失效（应该在保存完整响应时调用）
      expect(mockRedisService.invalidateChatCache).not.toHaveBeenCalled();

      // 验证返回对象
      expect(stream).toBeDefined();
      expect(saveResponse).toBeDefined();
      expect(typeof saveResponse).toBe('function');

      // 测试saveResponse功能
      mockChatMessageRepo.save.mockClear(); // 清除之前的调用记录
      mockRedisService.invalidateChatCache.mockClear(); // 清除之前的调用记录
      await saveResponse('Hello World');
      expect(mockChatMessageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: 'Hello World',
        }),
      );
      // 验证在保存响应后调用缓存失效
      expect(mockRedisService.invalidateChatCache).toHaveBeenCalledWith(
        mockChatId,
      );

      // 清理spy
      getOptimizedContextWindowSpy.mockRestore();
    });

    it('should throw error if OpenAI API call fails', async () => {
      mockCreateCompletion.mockRejectedValueOnce(new Error('OpenAI API Error'));

      await expect(
        service.chatWithAIStream(mockChatId, mockMessage),
      ).rejects.toThrow('Failed to stream chat with AI: OpenAI API Error');
    });

    it('should throw error if chat session not found', async () => {
      mockChatSessionRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.chatWithAIStream(mockChatId, mockMessage),
      ).rejects.toThrow(
        `Failed to stream chat with AI: Chat session with ID ${mockChatId} not found`,
      );
    });

    it('should handle streaming content correctly', async () => {
      const { stream } = await service.chatWithAIStream(
        mockChatId,
        mockMessage,
      );

      // 消费流并验证内容
      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
      }

      expect(fullContent).toBe('Hello World');
    });
  });
});
