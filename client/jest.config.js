const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

// Jest 配置
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
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