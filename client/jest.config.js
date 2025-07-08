module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.html$',
      useESM: true,
    },
  },
  transform: {
    '^.+\\.(ts|js|html)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>'],
  testMatch: ['**/+(*.)+(spec|test).+(ts)?(x)'],
  transformIgnorePatterns: ['node_modules/(?!@angular|rxjs|tslib)'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1', // optional: adjust if you use path aliases
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
};
