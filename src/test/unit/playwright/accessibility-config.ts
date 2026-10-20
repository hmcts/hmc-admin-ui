describe('native accessibility Playwright configuration', () => {
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

  test('selects local accessibility specs and publishes separate output', () => {
    const config = require('../../../../playwright.accessibility.config.ts').default;

    expect(config.testDir).toBe('./playwright/accessibility');
    expect(config.testMatch).toEqual(['**/*.local.a11y.spec.ts']);
    expect(config.outputDir).toContain('functional-output/tests/playwright-accessibility');
    expect(config.use.ignoreHTTPSErrors).toBe(true);
  });
});
