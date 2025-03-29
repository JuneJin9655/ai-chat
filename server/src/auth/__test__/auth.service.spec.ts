import { Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { User } from 'src/users/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Role } from 'src/common/enums/roles.enum';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CacheModule } from '@nestjs/cache-manager';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let jwtService: JwtService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);
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

      const result = await service.login(username, password);

      expect(result).toEqual({
        access_token: 'mock.jwt.token',
        refresh_token: 'mock.refresh.token',
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const username = 'nonexistent';
      const password = 'password123';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException,
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

      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException,
      );
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
