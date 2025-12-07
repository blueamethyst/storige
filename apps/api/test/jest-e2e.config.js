module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
      },
    }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@storige/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],
  testTimeout: 30000,
};
