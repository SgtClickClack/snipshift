/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/snipshift-next/web/src'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/tests/'],
  setupFilesAfterEnv: ['<rootDir>/snipshift-next/web/src/setupTests.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/snipshift-next/web/src/$1',
    '^@shared/(.*)$': '<rootDir>/snipshift-next/web/src/shared/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'snipshift-next/web/src/**/*.{ts,tsx}',
    '!snipshift-next/web/src/**/*.d.ts',
    '!snipshift-next/web/src/**/*.test.{ts,tsx}',
    '!snipshift-next/web/src/**/*.spec.{ts,tsx}',
    '!snipshift-next/web/src/main.tsx',
  ],
};

