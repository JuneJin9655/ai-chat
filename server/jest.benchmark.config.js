module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testEnvironment: 'node',
    testRegex: '.bench.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    setupFiles: ['<rootDir>/test/setup.ts'],
    verbose: true,
};