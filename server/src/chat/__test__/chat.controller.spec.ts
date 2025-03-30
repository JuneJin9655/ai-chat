import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';
import { ChatSession } from '../entities/chat_sessions.entity';
import { ChatMessage } from '../entities/chat_messages.entity';
import { Request } from 'express';

describe('ChatController', () => {
  let controller: ChatController;

  const mockDate = '2025-03-30T04:30:40.074Z';
  const mockUserId = 'test-user-id';
  const mockChatId = 'test-chat-id';

  const mockChat = {
    id: mockChatId,
    userId: mockUserId,
    messages: [],
    createdAt: new Date(mockDate),
  } as ChatSession;

  const mockUserMessage = {
    id: '1',
    chat: mockChat,
    role: 'user',
    content: 'Hello AI',
    timestamp: new Date(mockDate),
  } as ChatMessage;

  const mockAIMessage = {
    id: '2',
    chat: mockChat,
    role: 'assistant',
    content: 'AI response',
    timestamp: new Date(mockDate),
  } as ChatMessage;

  const mockChatService = {
    chatWithAI: jest.fn(),
    getAllChats: jest.fn(),
    createNewChat: jest.fn(),
    getChatById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createChat', () => {
    it('should create a new chat session', async () => {
      const mockRequest = {
        user: { id: mockUserId },
      } as Request;

      const newChatSpy =
        mockChatService.createNewChat.mockResolvedValue(mockChat);

      const result = await controller.createChat(mockRequest);

      expect(newChatSpy).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockChat);
    });

    it('should throw error if no user ID found', async () => {
      const mockRequest = {} as Request;

      await expect(controller.createChat(mockRequest)).rejects.toThrow(
        'Unauthorized: No user ID found',
      );
    });
  });

  describe('getAllChats', () => {
    it('should return all chats for user', async () => {
      const mockRequest = {
        user: { id: mockUserId },
      } as Request;
      const mockChats = [mockChat];

      const allChatsSpy =
        mockChatService.getAllChats.mockResolvedValue(mockChats);

      const result = await controller.getAllChats(mockRequest);

      expect(allChatsSpy).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockChats);
    });

    it('should throw error if no user ID found', async () => {
      const mockRequest = {} as Request;

      await expect(controller.getAllChats(mockRequest)).rejects.toThrow(
        'Unauthorized: No user ID found',
      );
    });
  });

  describe('getChatById', () => {
    it('should return chat by id', async () => {
      const getChatById =
        mockChatService.getChatById.mockResolvedValue(mockChat);

      const result = await controller.getChatById(mockChatId);

      expect(getChatById).toHaveBeenCalledWith(mockChatId);
      expect(result).toEqual(mockChat);
    });
  });

  describe('chatWithAI', () => {
    const mockMessage = 'Hello AI';
    const expectedResponse = {
      chatId: mockChatId,
      messages: [mockUserMessage, mockAIMessage],
    };

    it('should process chat message and return response', async () => {
      const chatWithAI =
        mockChatService.chatWithAI.mockResolvedValue(expectedResponse);

      const result = await controller.chatWithAI(mockChatId, {
        message: mockMessage,
      });

      expect(chatWithAI).toHaveBeenCalledWith(mockChatId, mockMessage);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw error if message is missing', async () => {
      await expect(controller.chatWithAI(mockChatId, {})).rejects.toThrow(
        'Message content is required',
      );
    });
  });
});
