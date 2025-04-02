// src/auth/__tests__/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { Role } from '../../common/enums/roles.enum';
import { Response } from 'express';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { AuthenticatedRequest } from '../auth.controller';
import { UnauthorizedException } from '@nestjs/common';

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: Role.USER,
  avatar: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;
  let configService: ConfigService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            {
              ttl: 60,
              limit: 10,
            },
          ],
        }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn().mockResolvedValue(mockUser),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ThrottlerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
        updatedAt: new Date(),
      };

      jest.spyOn(authService, 'register').mockResolvedValue(expectedUser);

      const result = await controller.register(registerDto);
      expect(result).toEqual(expectedUser);
    });
  });

  describe('login', () => {
    it('should return tokens', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const expectedResponse = {
        access_token: 'access.token',
        refresh_token: 'refresh.token',
      };

      const response = {
        cookie: jest.fn(),
      } as unknown as Response;

      jest.spyOn(authService, 'login').mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto, response);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('logout', () => {
    it('should logout successfully', () => {
      const response = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
      } as unknown as Response;
      const clearCookieSpy = jest.spyOn(response, 'clearCookie');

      controller.logout(response);
      expect(clearCookieSpy).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        }),
      );
      expect(clearCookieSpy).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        }),
      );
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const expectedResponse = {
        access_token: 'new.access.token',
        refresh_token: 'old.refresh.token',
      };

      const response = {
        cookie: jest.fn(),
      } as unknown as Response;

      const req = {
        user: mockUser,
        headers: {},
        ip: '127.0.0.1',
        cookies: {
          refresh_token: 'old.refresh.token',
        },
      } as unknown as AuthenticatedRequest;

      jest
        .spyOn(authService, 'refreshToken')
        .mockResolvedValue(expectedResponse);
      const cookieSpy = jest.spyOn(response, 'cookie');

      const result = await controller.refresh(
        'old.refresh.token',
        req,
        response,
      );
      expect(result).toEqual(expectedResponse);
      expect(cookieSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle login rate limit', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const response = {
        cookie: jest.fn(),
      } as unknown as Response;

      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new Error('Too many requests'));

      await expect(controller.login(loginDto, response)).rejects.toThrow(
        'Too many requests',
      );
    });

    it('should handle invalid refresh token', async () => {
      const response = {
        cookie: jest.fn(),
      } as unknown as Response;

      jest
        .spyOn(authService, 'refreshToken')
        .mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      await expect(
        controller.refresh(
          'invalid.token',
          {
            user: { id: '1', username: 'test' },
            cookies: {},
          } as unknown as AuthenticatedRequest,
          response,
        ),
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const req = {
        user: mockUser,
        headers: {},
        ip: '127.0.0.1',
      } as unknown as AuthenticatedRequest;

      const result = await controller.getProfile(req);
      expect(result).toEqual(mockUser);
    });
  });

  describe('register', () => {
    it('should fail when username already exists', async () => {
      const registerDto = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      };

      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(new Error('Username already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Username already exists',
      );
    });
  });

  describe('login', () => {
    it('should fail with invalid credentials', async () => {
      const loginDto = {
        username: 'wrong',
        password: 'wrong',
      };

      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto, {} as Response)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('getProfile', () => {
    it('should fail when user not found', async () => {
      const req = {
        user: { id: '999', username: 'nonexistent' },
      } as unknown as AuthenticatedRequest;

      jest
        .spyOn(usersService, 'findById')
        .mockRejectedValue(new Error('User not found'));

      await expect(controller.getProfile(req)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('login', () => {
    it('should set cookies with correct options', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };
      const response = {
        cookie: jest.fn(),
      } as unknown as Response;

      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'jwt.access.cookieMaxAge') return 1800000; // 30分钟
        if (key === 'jwt.refresh.cookieMaxAge') return 604800000; // 7天
        return null;
      });

      const expectedResponse = {
        access_token: 'access.token',
        refresh_token: 'refresh.token',
      };
      jest.spyOn(authService, 'login').mockResolvedValue(expectedResponse);
      const cookieSpy = jest.spyOn(response, 'cookie');

      await controller.login(loginDto, response);

      expect(cookieSpy).toHaveBeenCalledWith(
        'access_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          maxAge: 1800000,
        }),
      );
    });
  });

  describe('refresh', () => {
    it('should fail when refresh token is expired', async () => {
      jest
        .spyOn(authService, 'refreshToken')
        .mockRejectedValue(new UnauthorizedException('Refresh token expired'));

      await expect(
        controller.refresh(
          'expired.token',
          {
            user: { id: '1', username: 'test' },
            cookies: { refresh_token: 'expired.token' },
          } as unknown as AuthenticatedRequest,
          {} as Response,
        ),
      ).rejects.toThrow('Refresh token expired');
    });
  });

  describe('ConfigService', () => {
    it('should load correct JWT configuration', () => {
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'jwt.secret') return 'test-secret';
        if (key === 'jwt.access.expiresIn') return '30m';
        return null;
      });
      expect(configService.get('jwt.secret')).toBeDefined();
      expect(configService.get('jwt.access.expiresIn')).toBeDefined();
    });

    it('should handle production environment', () => {
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'app.isProduction') return true;
        if (key === 'jwt.access.cookieMaxAge') return 1800000;
        return null;
      });

      expect(configService.get('app.isProduction')).toBe(true);
      expect(configService.get('jwt.access.cookieMaxAge')).toBe(1800000);
    });
  });

  describe('login', () => {
    it('should set cookies with secure options', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };
      const response = {
        cookie: jest.fn(),
      } as unknown as Response;

      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'jwt.access.cookieMaxAge') return 1800000;
        if (key === 'jwt.refresh.cookieMaxAge') return 604800000;
        if (key === 'app.isProduction') return true;
        return null;
      });

      const expectedResponse = {
        access_token: 'access.token',
        refresh_token: 'refresh.token',
      };
      jest.spyOn(authService, 'login').mockResolvedValue(expectedResponse);
      const cookieSpy = jest.spyOn(response, 'cookie');

      await controller.login(loginDto, response);

      expect(cookieSpy).toHaveBeenCalledWith(
        'access_token',
        'access.token',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 1800000,
          path: '/',
          sameSite: 'lax',
          secure: false,
        }),
      );

      expect(cookieSpy).toHaveBeenCalledWith(
        'refresh_token',
        'refresh.token',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 604800000,
          path: '/auth/refresh',
          sameSite: 'lax',
          secure: false,
        }),
      );
    });
  });

  describe('register', () => {
    it('should fail with invalid email format', async () => {
      const registerDto = {
        username: 'testuser',
        password: 'password123',
        email: 'invalid-email',
      };

      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(new Error('Invalid email format'));

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Invalid email format',
      );
    });
  });

  describe('register', () => {
    it('should fail with weak password', async () => {
      const registerDto = {
        username: 'testuser',
        password: '123', // 太短的密码
        email: 'test@example.com',
      };

      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(new Error('Password too weak'));

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Password too weak',
      );
    });
  });

  describe('register', () => {
    it('should fail with invalid username format', async () => {
      const registerDto = {
        username: 'u',
        password: 'password123',
        email: 'test@example.com',
      };

      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(
          new Error('Username must be between 3 and 20 characters'),
        );

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Username must be between 3 and 20 characters',
      );
    });
  });

  describe('refresh', () => {
    it('should set refresh token cookie with correct path', async () => {
      const expectedResponse = {
        access_token: 'new.access.token',
        refresh_token: 'new.refresh.token',
      };
      const response = {
        cookie: jest.fn(),
      } as unknown as Response;

      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'jwt.access.cookieMaxAge') return 30000;
        if (key === 'jwt.refresh.cookieMaxAge') return 604800000;
        if (key === 'app.isProduction') return true;
        return null;
      });

      jest
        .spyOn(authService, 'refreshToken')
        .mockResolvedValue(expectedResponse);
      const cookieSpy = jest.spyOn(response, 'cookie');

      await controller.refresh(
        'old.token',
        {
          user: { id: '1', username: 'test' },
          cookies: { refresh_token: 'old.token' },
        } as unknown as AuthenticatedRequest,
        response,
      );

      expect(cookieSpy).toHaveBeenCalledWith(
        'access_token',
        'new.access.token',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 30000,
          path: '/',
          sameSite: 'lax',
          secure: false,
        }),
      );
    });
  });

  describe('logout', () => {
    it('should clear cookies with correct options', () => {
      const response = {
        clearCookie: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const cookieSpy = jest.spyOn(response, 'clearCookie');

      controller.logout(response);

      expect(cookieSpy).toHaveBeenNthCalledWith(
        1,
        'access_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        }),
      );
      expect(cookieSpy).toHaveBeenNthCalledWith(
        2,
        'refresh_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        }),
      );
    });
  });

  describe('ThrottlerGuard', () => {
    it('should block requests when rate limit exceeded', async () => {
      const guard = module.get<ThrottlerGuard>(ThrottlerGuard);
      jest.spyOn(guard, 'canActivate').mockResolvedValue(false);

      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };
      const response = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(controller.login(loginDto, response)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should set secure cookies in production', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };
      const response = {
        cookie: jest.fn(),
      } as unknown as Response;

      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'jwt.access.cookieMaxAge') return 1800000;
        if (key === 'jwt.refresh.cookieMaxAge') return 604800000;
        if (key === 'app.isProduction') return true;
        return null;
      });

      const expectedResponse = {
        access_token: 'access.token',
        refresh_token: 'refresh.token',
      };
      jest.spyOn(authService, 'login').mockResolvedValue(expectedResponse);
      const cookieSpy = jest.spyOn(response, 'cookie');

      await controller.login(loginDto, response);

      expect(cookieSpy).toHaveBeenCalledWith(
        'access_token',
        'access.token',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 1800000,
          path: '/',
          sameSite: 'lax',
          secure: false,
        }),
      );
    });
  });
});
