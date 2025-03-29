import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth-context';
import { authApi } from '../api';

// 模拟 API
jest.mock('../api', () => ({
    authApi: {
        login: jest.fn(),
        register: jest.fn(),
        getProfile: jest.fn(),
        logout: jest.fn(),
    }
}));

// 测试组件以访问 context 值
const TestComponent = () => {
    const auth = useAuth();
    return (
        <div>
            <div data-testid="loading">{auth.loading.toString()}</div>
            <div data-testid="error">{auth.error || 'no-error'}</div>
            <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'no-user'}</div>
            <button onClick={() => auth.login('testuser', 'password123')}>Login</button>
            <button onClick={() => auth.logout()}>Logout</button>
            <button onClick={() => auth.register('newuser', 'password123')}>Register</button>
            <button onClick={() => auth.setShowLoginForm(true)}>Show Login</button>
            <button onClick={() => auth.setShowRegisterForm(true)}>Show Register</button>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // 重置 localStorage mock
        localStorage.clear();
    });

    // 测试初始状态
    it('initializes with loading state', () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByTestId('loading').textContent).toBe('true');
        expect(screen.getByTestId('user').textContent).toBe('no-user');
        expect(screen.getByTestId('error').textContent).toBe('no-error');
    });

    // 测试自动身份验证
    it('checks authentication on mount', async () => {
        // 模拟 getProfile 成功
        const mockUser = {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'USER'
        };
        (authApi.getProfile as jest.Mock).mockResolvedValue(mockUser);

        await act(async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );
        });

        // 等待加载完成
        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });

        expect(authApi.getProfile).toHaveBeenCalled();
        expect(screen.getByTestId('user').textContent).toBe(JSON.stringify(mockUser));
    });

    // 测试登录成功
    it('handles successful login', async () => {
        // 模拟 login 和 getProfile 成功
        (authApi.login as jest.Mock).mockResolvedValue({
            access_token: 'test-token',
            refresh_token: 'refresh-token'
        });

        const mockUser = {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'USER'
        };
        (authApi.getProfile as jest.Mock).mockResolvedValue(mockUser);

        await act(async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );
        });

        // 首先等待初始化完成
        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });

        // 点击登录按钮
        await act(async () => {
            screen.getByText('Login').click();
        });

        // 等待登录完成
        await waitFor(() => {
            expect(authApi.login).toHaveBeenCalledWith({
                username: 'testuser',
                password: 'password123'
            });
            expect(authApi.getProfile).toHaveBeenCalled();
            expect(screen.getByTestId('user').textContent).toBe(JSON.stringify(mockUser));
        });
    });

    // 测试登录失败
    it('handles login failure', async () => {
        // 模拟 login 失败
        const errorMsg = 'Invalid credentials';
        (authApi.login as jest.Mock).mockRejectedValue({
            response: {
                data: {
                    error: { message: errorMsg }
                }
            }
        });

        await act(async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );
        });

        // 首先等待初始化完成
        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });

        // 点击登录按钮
        await act(async () => {
            screen.getByText('Login').click();
        });

        // 等待错误状态更新
        await waitFor(() => {
            expect(screen.getByTestId('error').textContent).toBe(errorMsg);
        });
    });

    // 测试注册
    it('handles registration', async () => {
        // 模拟 register 成功
        (authApi.register as jest.Mock).mockResolvedValue({
            id: 2,
            username: 'newuser',
            email: null,
            role: 'USER'
        });

        await act(async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );
        });

        // 首先等待初始化完成
        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });

        // 点击注册按钮
        await act(async () => {
            screen.getByText('Register').click();
        });

        // 验证 API 调用
        await waitFor(() => {
            expect(authApi.register).toHaveBeenCalledWith({
                username: 'newuser',
                password: 'password123'
            });
        });
    });

    // 测试登出
    it('handles logout', async () => {
        // 先模拟登录状态
        const mockUser = {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'USER'
        };
        (authApi.getProfile as jest.Mock).mockResolvedValue(mockUser);

        await act(async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );
        });

        // 等待加载完成，用户已登录
        await waitFor(() => {
            expect(screen.getByTestId('user').textContent).toBe(JSON.stringify(mockUser));
        });

        // 模拟登出成功
        (authApi.logout as jest.Mock).mockResolvedValue({});

        // 点击登出按钮
        await act(async () => {
            screen.getByText('Logout').click();
        });

        // 验证状态更新
        await waitFor(() => {
            expect(authApi.logout).toHaveBeenCalled();
            expect(screen.getByTestId('user').textContent).toBe('no-user');
        });
    });

    // 测试表单显示切换
    it('toggles form display', async () => {
        // 创建状态监听器
        const mockSetShowLoginForm = jest.fn();
        const mockSetShowRegisterForm = jest.fn();

        // 自定义 hook 用于访问和监听状态变化
        const TestStateComponent = () => {
            const { setShowLoginForm, setShowRegisterForm } = useAuth();

            // 使用监听器包装原始函数
            const wrappedSetShowLoginForm = (value: boolean) => {
                mockSetShowLoginForm(value);
                setShowLoginForm(value);
            };

            const wrappedSetShowRegisterForm = (value: boolean) => {
                mockSetShowRegisterForm(value);
                setShowRegisterForm(value);
            };

            return (
                <div>
                    <button onClick={() => wrappedSetShowLoginForm(true)}>Show Login</button>
                    <button onClick={() => wrappedSetShowRegisterForm(true)}>Show Register</button>
                </div>
            );
        };

        await act(async () => {
            render(
                <AuthProvider>
                    <TestStateComponent />
                </AuthProvider>
            );
        });

        // 点击显示登录表单按钮
        await act(async () => {
            screen.getByText('Show Login').click();
        });

        // 验证状态更新
        expect(mockSetShowLoginForm).toHaveBeenCalledWith(true);

        // 点击显示注册表单按钮
        await act(async () => {
            screen.getByText('Show Register').click();
        });

        // 验证状态更新
        expect(mockSetShowRegisterForm).toHaveBeenCalledWith(true);
    });
}); 