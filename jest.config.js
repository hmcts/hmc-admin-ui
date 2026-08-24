module.exports = {
  roots: ['<rootDir>/src/test/unit'],
  testRegex: '(/src/test/.*|\\.(test|spec))\\.(ts|js)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/functional-output/tests/jest-unit',
        outputName: 'junit.xml',
      },
    ],
  ],
};
