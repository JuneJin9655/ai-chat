import { Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../common/enums/roles.enum';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '../../common/services/redis.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let jwtService: JwtService;
  let usersService: UsersService;
  let redisService: RedisService;

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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);
    redisService = module.get<RedisService>(RedisService);
  });

  // 重置所有 mock 数据
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a new user', async () => {
      const registerDto = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      };

      const expectedUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: Role.USER,
        avatar: '',
        createdAt: new Date(),
      };

      const createSpy = jest
        .spyOn(usersService, 'create')
        .mockResolvedValue(expectedUser);
      const result = await service.register(registerDto);
      expect(result).toEqual(expectedUser);
      expect(createSpy).toHaveBeenCalledWith(registerDto, Role.USER);
    });
  });

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      const username = 'testuser';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const mockUser = {
        id: 1,
        username,
        password: hashedPassword,
        email: 'test@example.com',
        role: Role.USER,
        avatar: '',
        createdAt: new Date(),
      } as User;

      const mockRefreshToken = {
        id: 1,
        token: 'mock.refresh.token',
        expiresAt: new Date(),
        user: mockUser,
        userId: mockUser.id,
        createdAt: new Date(),
        isRevoked: false,
      } as unknown as RefreshToken;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(refreshTokenRepository, 'create')
        .mockReturnValue(mockRefreshToken);
      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue(mockRefreshToken);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mock.jwt.token');

      // 确保 Redis 模拟正确返回
      jest.spyOn(redisService.redis, 'get').mockResolvedValue(null);
      const setexSpy = jest
        .spyOn(redisService.redis, 'setex')
        .mockResolvedValue('OK');
      const delSpy = jest.spyOn(redisService.redis, 'del').mockResolvedValue(1);

      const result = await service.login(username, password);

      expect(result).toEqual({
        access_token: 'mock.jwt.token',
        refresh_token: 'mock.refresh.token',
      });

      // 验证 Redis 方法被正确调用
      expect(setexSpy).toHaveBeenCalledWith(
        `auth_token_${mockUser.id}`,
        3600,
        'mock.jwt.token',
      );
      expect(delSpy).toHaveBeenCalledWith(`login_failed_${username}`);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const username = 'nonexistent';
      const password = 'password123';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // 模拟失败登录尝试计数
      jest.spyOn(redisService.redis, 'get').mockResolvedValue(null);
      const setexSpy = jest
        .spyOn(redisService.redis, 'setex')
        .mockResolvedValue('OK');

      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException,
      );

      // 验证失败尝试次数增加
      expect(setexSpy).toHaveBeenCalledWith(
        `login_failed_${username}`,
        300,
        '1',
      );
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const username = 'testuser';
      const password = 'wrongpassword';
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      const mockUser = {
        id: 1,
        username,
        password: hashedPassword,
        email: 'test@example.com',
        role: Role.USER,
        avatar: '',
        createdAt: new Date(),
      } as User;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      // 模拟失败登录尝试计数
      jest.spyOn(redisService.redis, 'get').mockResolvedValue(null);
      const setexSpy = jest
        .spyOn(redisService.redis, 'setex')
        .mockResolvedValue('OK');

      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException,
      );

      // 验证失败尝试次数增加
      expect(setexSpy).toHaveBeenCalledWith(
        `login_failed_${username}`,
        300,
        '1',
      );
    });

    it('should throw UnauthorizedException when too many failed attempts', async () => {
      const username = 'testuser';
      const password = 'password123';

      // 模拟 5 次失败尝试
      jest.spyOn(redisService.redis, 'get').mockResolvedValue('5');
      const findOneSpy = jest.spyOn(userRepository, 'findOne');

      await expect(service.login(username, password)).rejects.toThrow(
        'Too many failed attempts. Try again later.',
      );

      expect(findOneSpy).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should return new access token when refresh token is valid', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpassword',
        email: 'test@example.com',
        role: Role.USER,
        avatar: '',
        createdAt: new Date(),
      } as User;

      const mockRefreshToken = {
        id: 1,
        token: 'valid.refresh.token',
        expiresAt: new Date(Date.now() + 3600000),
        user: mockUser,
        userId: mockUser.id,
        createdAt: new Date(),
        isRevoked: false,
      } as unknown as RefreshToken;

      jest
        .spyOn(refreshTokenRepository, 'findOne')
        .mockResolvedValue(mockRefreshToken);
      jest.spyOn(jwtService, 'sign').mockReturnValue('new.access.token');

      const result = await service.refreshToken('valid.refresh.token');

      expect(result).toEqual({
        access_token: 'new.access.token',
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(null);

      await expect(service.refreshToken('invalid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
