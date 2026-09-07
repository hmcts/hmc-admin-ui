module.exports = {
  roots: ['<rootDir>/src/test/smoke'],
  testRegex: '(/src/test/.*|\\.test)\\.(ts|js)$',
  testEnvironment: 'node',
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Smoke Test Report',
        outputPath: '<rootDir>/functional-output/tests/jest-smoke/html-report/test-report.html',
        includeFailureMsg: true,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/functional-output/tests/jest-smoke',
        outputName: 'junit.xml',
      },
    ],
  ],
};
