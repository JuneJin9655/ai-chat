/// <reference types="jest" />
import { api, authApi, chatApi } from '../api';

// 在测试开始前模拟 axios
jest.mock('axios', () => {
    return {
        create: jest.fn(() => ({
            interceptors: {
                response: {
                    use: jest.fn(),
                }
            },
            defaults: {},
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
        })),
    };
});

describe('API Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // 测试登录 API
    it('calls login API with correct parameters', async () => {
        const mockCredentials = { username: 'testuser', password: 'password123' };
        const mockResponse = {
            data: {
                data: {
                    access_token: 'test-token',
                    refresh_token: 'refresh-token'
                }
            }
        };
        (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await authApi.login(mockCredentials);

        expect(api.post).toHaveBeenCalledWith('/auth/login', mockCredentials);
        expect(result).toEqual(mockResponse.data.data);
    });

    // 测试注册 API
    it('calls register API with correct parameters', async () => {
        const mockCredentials = {
            username: 'newuser',
            password: 'password123',
            email: 'test@example.com'
        };
        const mockResponse = {
            data: {
                data: {
                    id: 1,
                    username: 'newuser',
                    email: 'test@example.com',
                    role: 'USER'
                }
            }
        };
        (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await authApi.register(mockCredentials);

        expect(api.post).toHaveBeenCalledWith('/auth/register', mockCredentials);
        expect(result).toEqual(mockResponse.data.data);
    });

    // 测试获取用户信息 API
    it('calls getProfile API', async () => {
        const mockResponse = {
            data: {
                data: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'USER'
                }
            }
        };
        (api.get as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await authApi.getProfile();

        expect(api.get).toHaveBeenCalledWith('/auth/profile');
        expect(result).toEqual(mockResponse.data.data);
    });

    // 测试登出 API
    it('calls logout API', async () => {
        const mockResponse = { data: { success: true } };
        (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

        await authApi.logout();

        expect(api.post).toHaveBeenCalledWith('/auth/logout');
    });

    // 测试刷新令牌 API
    it('calls refreshToken API', async () => {
        const mockResponse = {
            data: {
                data: {
                    access_token: 'new-token',
                    refresh_token: 'refresh-token'
                }
            }
        };
        (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await authApi.refreshToken();

        expect(api.post).toHaveBeenCalledWith('/auth/refresh');
        expect(result).toEqual(mockResponse.data.data);
    });

    // 测试发送消息 API
    it('calls sendMessage API with correct parameters', async () => {
        const mockMessage = 'Hello, world!';
        const mockResponse = {
            data: {
                message: 'Hello, world!',
                timestamp: '2023-08-01T12:00:00Z'
            }
        };
        (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await chatApi.sendMessage(mockMessage);

        expect(api.post).toHaveBeenCalledWith('/chat', { message: mockMessage });
        expect(result).toEqual(mockResponse.data);
    });

    // 测试错误处理
    it('handles API errors properly', async () => {
        const mockError = new Error('Network Error');
        (api.post as jest.Mock).mockRejectedValueOnce(mockError);

        await expect(authApi.login({ username: 'user', password: 'pass' }))
            .rejects.toThrow('Network Error');
    });
}); 