module.exports = {
  roots: ['<rootDir>/client/src/test/unit', '<rootDir>/server/src/test/unit'],
  testRegex: '(/client/src/test/.*|\\.(test|spec))\\.(ts|js)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
};
