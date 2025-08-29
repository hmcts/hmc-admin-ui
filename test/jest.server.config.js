/** @type {import('jest').Config} */
module.exports = {
  // make it explicit (it's already the default when config is under /test)
  rootDir: __dirname,

  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/server/**/*.spec.ts'],
  maxWorkers: 1,
  testTimeout: 150000,

  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
};
