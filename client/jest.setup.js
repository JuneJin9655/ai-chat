// 导入 Jest DOM 扩展
import '@testing-library/jest-dom';

// 模拟 next/router
jest.mock('next/router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        pathname: '/',
        query: {},
    }),
}));

// 模拟 next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn().mockReturnValue({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        prefetch: jest.fn(),
        pathname: '/',
    }),
    usePathname: jest.fn().mockReturnValue('/'),
    useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
}));

// 设置 localStorage 模拟
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
    },
    writable: true,
});

// 禁用控制台错误/警告 (可选)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// }; 