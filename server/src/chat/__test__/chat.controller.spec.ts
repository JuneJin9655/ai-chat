import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            // Add mock methods as needed
            createCompletion: jest.fn(),
            createChatCompletion: jest.fn(),
            chatWithAI: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat', () => {
    it('should call chatWithAI and return response', async () => {
      const message = 'Hello, AI!';
      const expectedResponse = {
        message: 'Hello, human!',
        usage: {
          total_tokens: 10,
          completion_tokens: 5,
          prompt_tokens: 5,
        },
      };

      const chatWithAISpy = jest
        .spyOn(chatService, 'chatWithAI')
        .mockResolvedValue(expectedResponse);

      const result = await controller.chat({ message });
      expect(chatWithAISpy).toHaveBeenCalledWith(message);
      expect(result).toEqual(expectedResponse);
    });
  });
});
