import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../chat.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('openai');

describe('ChatService', () => {
  let service: ChatService;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    mockCreate = jest.fn();
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }) as unknown as OpenAI,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'OPENAI_API_KEY':
                  return 'mock-api-key';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chatWithAI', () => {
    it('should return AI response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4',
        choices: [
          {
            message: {
              content: 'Hello human',
              role: 'assistant',
            },
            index: 0,
            finish_reason: 'stop',
          },
        ],
        usage: {
          total_tokens: 10,
          completion_tokens: 5,
          prompt_tokens: 5,
        },
      } as unknown as OpenAI.Chat.ChatCompletion;

      mockCreate.mockResolvedValue(mockResponse);

      const result = await service.chatWithAI('Hello AI');
      expect(result).toEqual({
        message: 'Hello human',
        usage: {
          total_tokens: 10,
          completion_tokens: 5,
          prompt_tokens: 5,
        },
      });
    });

    it('should handle API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(service.chatWithAI('Hello AI')).rejects.toThrow(
        'Failed to chat with AI: API Error',
      );
    });

    it('should validate message format', async () => {
      // 测试空消息
      mockCreate.mockRejectedValue(new Error('Empty message'));
      await expect(service.chatWithAI('')).rejects.toThrow();

      // 测试超长消息
      const longMessage = 'x'.repeat(10000);
      mockCreate.mockRejectedValue(new Error('Message too long'));
      await expect(service.chatWithAI(longMessage)).rejects.toThrow();
    });
  });

  it('should respect rate limits', async () => {
    const mockResponse = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      model: 'gpt-4',
      choices: [
        {
          message: {
            content: 'Hello human',
            role: 'assistant',
          },
          index: 0,
          finish_reason: 'stop',
        },
      ],
      usage: {
        total_tokens: 10,
        completion_tokens: 5,
        prompt_tokens: 5,
      },
    } as unknown as OpenAI.Chat.ChatCompletion;

    mockCreate
      .mockResolvedValueOnce(mockResponse)
      .mockRejectedValueOnce(new Error('Too Many Requests'));

    // 第一次请求成功
    await service.chatWithAI('test');
    // 第二次请求应该失败
    await expect(service.chatWithAI('test')).rejects.toThrow(
      'Failed to chat with AI: Too Many Requests',
    );
  });

  it('should require authentication', async () => {
    const message = 'test';
    jest
      .spyOn(service, 'chatWithAI')
      .mockRejectedValue(new UnauthorizedException());
    await expect(service.chatWithAI(message)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
