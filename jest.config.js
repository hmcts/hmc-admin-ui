module.exports = {
  roots: ['<rootDir>/src'],
  testRegex: '/src/test/unit/.*\\.(ts|js)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/main/**/*.{ts,js}',
    '!src/main/app.ts',
    '!src/main/development.ts',
    '!src/main/index.js',
    '!src/main/server.ts',
    '!src/main/modules/nunjucks/*.ts',
    '!src/main/types/**/*.ts',
    '!src/main/public/**',
    '!src/main/views/**',
  ],
};
