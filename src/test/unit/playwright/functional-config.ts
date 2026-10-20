describe('native functional Playwright configuration', () => {
  const originalAuthEnabled = process.env.FUNCTIONAL_TEST_AUTH_ENABLED;
  const originalTestUrl = process.env.TEST_URL;

  beforeEach(() => {
    process.env.FUNCTIONAL_TEST_AUTH_ENABLED = 'false';
    process.env.TEST_URL = 'http://localhost:3000';
    jest.resetModules();
  });

  afterEach(() => {
    if (originalAuthEnabled === undefined) {
      delete process.env.FUNCTIONAL_TEST_AUTH_ENABLED;
    } else {
      process.env.FUNCTIONAL_TEST_AUTH_ENABLED = originalAuthEnabled;
    }
    if (originalTestUrl === undefined) {
      delete process.env.TEST_URL;
    } else {
      process.env.TEST_URL = originalTestUrl;
    }
  });

  test('preserves the legacy functional TLS tolerance', () => {
    const config = require('../../../../playwright.functional.config.ts').default;

    expect(config.use.ignoreHTTPSErrors).toBe(true);
    expect(config.testMatch).toEqual(['**/*.local.spec.ts']);
  });
});
