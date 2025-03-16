// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/roles.enum';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
    let service: AuthService;
    let userRepository: Repository<User>;
    let refreshTokenRepository: Repository<RefreshToken>;
    let jwtService: JwtService;
    let usersService: UsersService;

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

            jest.spyOn(usersService, 'create').mockResolvedValue(expectedUser);

            const result = await service.register(registerDto);

            expect(result).toEqual(expectedUser);
            expect(usersService.create).toHaveBeenCalledWith(registerDto, Role.USER);
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
            };

            const mockRefreshToken = {
                id: 1,
                token: 'refresh-token',
                userId: mockUser.id,
                expiresAt: new Date(),
                user: mockUser,
                creatAt: new Date(),
                isRevoked: false
            };

            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(refreshTokenRepository, 'create').mockReturnValue(mockRefreshToken);
            jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue(mockRefreshToken);
            jest.spyOn(jwtService, 'sign').mockReturnValue('jwt-token');

            const result = await service.login(username, password);

            expect(result).toEqual({
                access_token: 'jwt-token',
                refresh_token: 'refresh-token',
            });
        });

        it('should throw UnauthorizedException when user not found', async () => {
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

            await expect(service.login('wronguser', 'password')).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException when password is wrong', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                password: 'hashedpassword',
                email: 'test@example.com',
                role: Role.USER,
                avatar: '',
                createdAt: new Date()
            };

            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

            await expect(service.login('testuser', 'wrongpassword')).rejects.toThrow(
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
                createdAt: new Date()
            };

            const mockRefreshToken = {
                id: 1,
                token: 'valid-refresh-token',
                userId: mockUser.id,
                user: mockUser,
                isRevoked: false,
                expiresAt: new Date(Date.now() + 1000000),
                creatAt: new Date()
            };

            jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(mockRefreshToken);
            jest.spyOn(jwtService, 'sign').mockReturnValue('new-jwt-token');

            const result = await service.refreshToken('valid-refresh-token');

            expect(result).toEqual({
                access_token: 'new-jwt-token',
            });
        });

        it('should throw UnauthorizedException when refresh token is invalid', async () => {
            jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(null);

            await expect(service.refreshToken('invalid-token')).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});