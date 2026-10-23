jest.mock('@playwright/test', () => ({ defineConfig: (config: unknown) => config }));

describe('native functional Playwright configuration', () => {
  const originalTestUrl = process.env.TEST_URL;
  const originalUsername = process.env.TEST_IDAM_USERNAME;
  const originalPassword = process.env.TEST_IDAM_PASSWORD;

  beforeEach(() => {
    process.env.TEST_URL = 'https://preview.example';
    process.env.TEST_IDAM_USERNAME = 'test-user';
    process.env.TEST_IDAM_PASSWORD = 'test-password';
    jest.resetModules();
  });

  afterEach(() => {
    if (originalTestUrl === undefined) {
      delete process.env.TEST_URL;
    } else {
      process.env.TEST_URL = originalTestUrl;
    }
    if (originalUsername === undefined) {
      delete process.env.TEST_IDAM_USERNAME;
    } else {
      process.env.TEST_IDAM_USERNAME = originalUsername;
    }
    if (originalPassword === undefined) {
      delete process.env.TEST_IDAM_PASSWORD;
    } else {
      process.env.TEST_IDAM_PASSWORD = originalPassword;
    }
  });

  test('selects protected OIDC specs and preserves TLS tolerance', () => {
    const config = require('../../../../playwright.functional.config.ts').default;

    expect(config.use.ignoreHTTPSErrors).toBe(true);
    expect(config.testMatch).toEqual(['**/*.oidc.spec.ts']);
    expect(config.webServer).toBeUndefined();
  });
  test('prevents protected capture and streams only safe reporter diagnostics', () => {
    const config = require('../../../../playwright.functional.config.ts').default;
    expect(config.use).toMatchObject({ trace: 'off', screenshot: 'off', video: 'off' });
    expect(config.quiet).toBe(true);
    expect(config.reporter[0][0]).toContain('odhin-adaptive.reporter.cjs');
    expect(process.env.PLAYWRIGHT_NO_COPY_PROMPT).toBe('1');
  });
});
