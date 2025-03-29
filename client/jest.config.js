const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // 指向 Next.js 应用的路径
    dir: './',
});

// Jest 配置
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        // 处理模块别名 (与 Next.js 配置保持一致)
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testEnvironment: 'jest-environment-jsdom',
    testPathIgnorePatterns: ['/node_modules/', '/.next/'],
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/_app.tsx',
        '!src/**/_document.tsx',
    ],
};

// createJestConfig 用于将 Next.js 的配置与 Jest 的配置合并
// 导出配置
module.exports = createJestConfig(customJestConfig); 