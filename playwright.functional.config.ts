import * as path from 'path';

import { defineConfig } from '@playwright/test';

const { normalizeOdhinReportFilename } = require('./playwright/reporters/odhin-filename.cjs') as {
  normalizeOdhinReportFilename: (filename: string) => string;
};

const authDisabled = process.env.FUNCTIONAL_TEST_AUTH_ENABLED === 'false';
const defaultReportDir = 'functional-output/tests/playwright-functional/odhin-report';
const reportDir = process.env.PLAYWRIGHT_REPORT_FOLDER ?? defaultReportDir;
const junitPath = process.env.PLAYWRIGHT_JUNIT_OUTPUT ?? path.join(reportDir, 'playwright-junit.xml');
const reportFile = normalizeOdhinReportFilename(
  process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME ?? 'hmc-playwright-functional.html'
);
const baseURL = resolveBaseUrl();

function resolveBaseUrl(): string {
  const targetUrl = process.env.TEST_URL ?? (authDisabled ? 'http://localhost:3000' : '');

  if (!targetUrl) {
    throw new Error('TEST_URL is required when FUNCTIONAL_TEST_AUTH_ENABLED is not false.');
  }

  const target = new URL(targetUrl);
  if (!authDisabled) {
    const missing = ['TEST_IDAM_USERNAME', 'TEST_IDAM_PASSWORD'].filter(name => !process.env[name]);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    if (['localhost', '127.0.0.1', '::1'].includes(target.hostname)) {
      throw new Error(
        'TEST_URL must target an OIDC-enabled deployment when FUNCTIONAL_TEST_AUTH_ENABLED is not false.'
      );
    }
  }

  return target.toString();
}

export default defineConfig({
  testDir: './playwright/functional',
  testMatch: authDisabled ? ['**/*.local.spec.ts'] : ['**/*.oidc.spec.ts'],
  forbidOnly: !!process.env.CI,
  outputDir:
    process.env.PLAYWRIGHT_OUTPUT_DIR ??
    process.env.PLAYWRIGHT_TEST_OUTPUT_DIR ??
    'functional-output/tests/playwright-functional/test-results',
  reporter: [
    [process.env.CI ? 'dot' : 'list'],
    [
      path.resolve(__dirname, 'playwright/reporters/odhin-adaptive.reporter.cjs'),
      {
        consoleError: true,
        consoleLog: true,
        indexFilename: reportFile,
        outputFolder: reportDir,
        project: 'HMC Admin UI',
        release: `branch=${process.env.BRANCH_NAME ?? 'local'}`,
        startServer: false,
        testEnvironment: `${authDisabled ? 'auth-disabled-local' : 'oidc'} | ${baseURL}`,
        testOutput: 'only-on-failure',
        title: 'HMC Admin UI Playwright Functional',
      },
    ],
    ['junit', { outputFile: junitPath }],
  ],
  retries: 0,
  timeout: 30 * 1000,
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: authDisabled
    ? {
        command: 'AUTH_ENABLED=false yarn start',
        reuseExistingServer: !process.env.CI,
        timeout: 30 * 1000,
        url: baseURL,
      }
    : undefined,
  workers: 1,
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
