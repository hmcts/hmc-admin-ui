describe('native accessibility Playwright configuration', () => {
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

  test('selects protected accessibility specs and publishes separate output', () => {
    const config = require('../../../../playwright.accessibility.config.ts').default;

    expect(config.testDir).toBe('./playwright/accessibility');
    expect(config.testMatch).toEqual(['**/*.oidc.a11y.spec.ts']);
    expect(config.outputDir).toContain('functional-output/tests/playwright-accessibility');
    expect(config.use.ignoreHTTPSErrors).toBe(true);
    expect(config.webServer).toBeUndefined();
  });
});
