// better handling of unhandled exceptions
process.on('unhandledRejection', reason => {
  throw reason;
});

// Configuration constants
const TEST_PORT = 3000;
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const TEST_PROTOCOL = isDevelopment ? 'https' : 'http';
const DEFAULT_TEST_URL = `${TEST_PROTOCOL}://localhost:${TEST_PORT}`;

// Only use TEST_URL from environment if it's explicitly set and valid
// This prevents accidentally using wrong ports from shell environment
const getTestUrl = (): string => {
  const envUrl = process.env.TEST_URL;
  // If TEST_URL is set and points to the correct port, use it
  // Otherwise, use the default configuration
  if (envUrl && envUrl.includes(`:${TEST_PORT}`)) {
    return envUrl;
  }
  return DEFAULT_TEST_URL;
};

export const config = {
  TEST_URL: getTestUrl(),
  TestHeadlessBrowser: process.env.TEST_HEADLESS ? process.env.TEST_HEADLESS === 'true' : true,
  TestSlowMo: 250,
  WaitForTimeout: 10000,

  Gherkin: {
    features: './src/test/functional/features/**/*.feature',
    steps: ['./src/test/steps/common.ts'],
  },
  helpers: {},
};

config.helpers = {
  Playwright: {
    url: config.TEST_URL,
    show: !config.TestHeadlessBrowser,
    browser: 'chromium',
    waitForTimeout: config.WaitForTimeout,
    waitForAction: 1000,
    waitForNavigation: 'networkidle0',
    ignoreHTTPSErrors: true,
  },
};
