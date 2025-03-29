/// <reference types="jest" />
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// 模拟 next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// 模拟 auth-context
jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

describe('LoginForm', () => {
    // 每个测试前重置模拟和状态
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({
            push: jest.fn(),
        });
    });

    // 测试组件渲染
    it('renders the login form correctly', () => {
        (useAuth as jest.Mock).mockReturnValue({
            login: jest.fn(),
            loading: false,
            error: null,
            setShowLoginForm: jest.fn(),
            setShowRegisterForm: jest.fn(),
        });

        render(<LoginForm />);

        // 验证表单元素存在
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
        expect(screen.getByText(/don't have an account\? register/i)).toBeInTheDocument();
    });

    // 测试切换到注册表单
    it('switches to registration form', async () => {
        const mockSetShowLoginForm = jest.fn();
        const mockSetShowRegisterForm = jest.fn();

        (useAuth as jest.Mock).mockReturnValue({
            login: jest.fn(),
            loading: false,
            error: null,
            setShowLoginForm: mockSetShowLoginForm,
            setShowRegisterForm: mockSetShowRegisterForm,
        });

        const user = userEvent.setup();

        render(<LoginForm />);

        // 点击注册链接
        await user.click(screen.getByText(/don't have an account\? register/i));

        // 验证状态更新
        expect(mockSetShowLoginForm).toHaveBeenCalledWith(false);
        expect(mockSetShowRegisterForm).toHaveBeenCalledWith(true);
    });
}); 