#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

const outputRoot =
  process.env.PLAYWRIGHT_ACCESSIBILITY_OUTPUT_ROOT || 'functional-output/tests/playwright-accessibility';
const reportDir = process.env.PLAYWRIGHT_REPORT_FOLDER || `${outputRoot}/odhin-report`;
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR || `${outputRoot}/test-results`;
const junitFile = process.env.PLAYWRIGHT_JUNIT_OUTPUT || `${outputRoot}/playwright-accessibility-junit.xml`;
const reportFile = process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME || 'hmc-playwright-accessibility.html';
const strictMode = ['1', 'true', 'yes', 'on'].includes((process.env.A11Y_STRICT || '').trim().toLowerCase());
const extraArgs = process.argv.slice(2);

fs.rmSync(reportDir, { recursive: true, force: true });
fs.rmSync(outputDir, { recursive: true, force: true });

const env = {
  ...process.env,
  PLAYWRIGHT_OUTPUT_DIR: outputDir,
  PLAYWRIGHT_JUNIT_OUTPUT: junitFile,
  PLAYWRIGHT_REPORT_FOLDER: reportDir,
  PLAYWRIGHT_REPORT_INDEX_FILENAME: reportFile,
};

const result = spawnSync(
  'npx',
  ['playwright', 'test', '--config=playwright.accessibility.config.ts', '--retries=0', ...extraArgs],
  { env, stdio: 'inherit' }
);
const testStatus = result.status ?? 1;
const outcome = testStatus === 0 ? 'completed' : 'test-failure';

const ensureStatus =
  spawnSync(
    'node',
    ['bin/ensure-odhin-report.js', '--report-dir', reportDir, '--report-file', reportFile, '--outcome', outcome],
    { env, stdio: 'inherit' }
  ).status ?? 1;
const verifyStatus =
  spawnSync('node', ['bin/verify-playwright-functional-report.js'], { env, stdio: 'inherit' }).status ?? 1;

if (ensureStatus !== 0 || verifyStatus !== 0) {
  process.exit(verifyStatus || ensureStatus);
}

if (testStatus !== 0 && !strictMode) {
  process.stderr.write(
    `[accessibility-report] Accessibility pack completed with status ${testStatus}; A11Y_STRICT is off so the run is report-only.\n`
  );
  process.exit(0);
}

process.exit(testStatus);
