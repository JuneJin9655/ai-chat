import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { Role } from '../common/enums/roles.enum';
import { AuthenticatedRequest } from './auth.controller';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;
    let usersService: UsersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ThrottlerModule.forRoot({
                    throttlers: [
                        {
                            ttl: 60000,
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
                        login: jest.fn(),
                        register: jest.fn(),
                        refreshToken: jest.fn(),
                    },
                },
                {
                    provide: UsersService,
                    useValue: {
                        findById: jest.fn(),
                        remove: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('login', () => {
        it('should return token when credentials are valid', async () => {
            const loginDto = {
                username: 'testuser',
                password: 'password123'
            };
            const expectedResult = {
                access_token: 'test-token',
                refresh_token: 'refresh-token'
            };

            jest.spyOn(authService, 'login').mockResolvedValue(expectedResult);

            const result = await controller.login(loginDto);
            expect(result).toEqual(expectedResult);
            expect(authService.login).toHaveBeenCalledWith(loginDto.username, loginDto.password);
        });
    });

    describe('register', () => {
        it('should create a new user and return user data', async () => {
            const registerDto = {
                username: 'newuser',
                password: 'password123',
                email: 'test@example.com',
                role: Role.USER
            };
            const expectedResult = {
                id: 1,
                username: 'newuser',
                email: 'test@example.com',
                role: Role.USER,
                avatar: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            jest.spyOn(authService, 'register').mockResolvedValue(expectedResult);

            const result = await controller.register(registerDto);
            expect(result).toEqual({
                ...expectedResult,
                updatedAt: expectedResult.createdAt
            });
            expect(authService.register).toHaveBeenCalledWith(registerDto);
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const userId = '1';
            const mockUser = {
                id: 1,
                username: 'testuser',
                password: '123456',
                email: 'test@example.com',
                role: Role.USER,
                avatar: '',
                createdAt: new Date()
            };
            const req = { user: { id: userId, username: 'testuser' } } as AuthenticatedRequest;

            jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser);

            const result = await controller.getProfile(req);
            expect(result).toEqual({
                ...mockUser,
                role: mockUser.role,
                updatedAt: mockUser.createdAt
            });
            expect(usersService.findById).toHaveBeenCalledWith(parseInt(userId));
        });
    });

    describe('refresh', () => {
        it('should refresh token and return new tokens', async () => {
            const refreshToken = 'old-refresh-token';
            const expectedResult = {
                access_token: 'new-access-token',
                refresh_token: 'new-refresh-token'
            };

            jest.spyOn(authService, 'refreshToken').mockResolvedValue({ access_token: expectedResult.access_token });

            const result = await controller.refresh(refreshToken);
            expect(result).toEqual({
                access_token: expectedResult.access_token,
                refresh_token: refreshToken
            });
            expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken);
        });
    });

    describe('remove', () => {
        it('should delete user and return success message', async () => {
            const userId = 1;
            jest.spyOn(usersService, 'remove').mockResolvedValue(undefined);

            const result = await controller.remove(userId);
            expect(result).toEqual({ message: 'User deleted successfully' });
            expect(usersService.remove).toHaveBeenCalledWith(userId);
        });
    });
});