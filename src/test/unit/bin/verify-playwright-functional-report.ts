import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const { verifyFunctionalReport } = require('../../../../bin/verify-playwright-functional-report');

describe('verifyFunctionalReport', () => {
  let reportDir: string;
  let originalReportFilename: string | undefined;

  beforeEach(() => {
    reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hmc-playwright-report-'));
    originalReportFilename = process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME;
  });

  afterEach(() => {
    fs.rmSync(reportDir, { force: true, recursive: true });
    if (originalReportFilename === undefined) {
      delete process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME;
    } else {
      process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME = originalReportFilename;
    }
  });

  test('accepts non-empty JUnit and Odhín reports with executed tests', () => {
    fs.writeFileSync(
      path.join(reportDir, 'playwright-junit.xml'),
      '<?xml version="1.0"?><testsuites tests="2"><testsuite tests="2"><testcase name="home" /></testsuite></testsuites>'
    );
    fs.writeFileSync(
      path.join(reportDir, 'hmc-playwright-functional.html'),
      '<!doctype html><html><body>Odhín</body></html>'
    );

    expect(verifyFunctionalReport({ reportDir })).toEqual({
      junitPath: path.join(reportDir, 'playwright-junit.xml'),
      odhinPath: path.join(reportDir, 'hmc-playwright-functional.html'),
      testCount: 2,
    });
  });

  test('uses the configured Odhín report filename', () => {
    process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME = 'configured-odhin.html';
    fs.writeFileSync(path.join(reportDir, 'playwright-junit.xml'), '<testsuites tests="1"><testcase /></testsuites>');
    fs.writeFileSync(path.join(reportDir, 'configured-odhin.html'), '<!doctype html><html><body>Odhín</body></html>');

    expect(verifyFunctionalReport({ reportDir })).toMatchObject({
      odhinPath: path.join(reportDir, 'configured-odhin.html'),
      testCount: 1,
    });
  });

  test('uses Odhín normalized filename for a configured dotted and spaced name', () => {
    process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME = 'playwright.functional report.html';
    fs.writeFileSync(path.join(reportDir, 'playwright-junit.xml'), '<testsuites tests="1"><testcase /></testsuites>');
    fs.writeFileSync(
      path.join(reportDir, 'playwright_functional_report.html'),
      '<!doctype html><html><body>Odhín</body></html>'
    );

    expect(verifyFunctionalReport({ reportDir })).toMatchObject({
      odhinPath: path.join(reportDir, 'playwright_functional_report.html'),
      testCount: 1,
    });
  });

  test.each([
    ['missing JUnit', undefined, '<!doctype html><html></html>'],
    ['empty JUnit', '', '<!doctype html><html></html>'],
    ['zero selected tests', '<testsuites tests="0"></testsuites>', '<!doctype html><html></html>'],
    ['only skipped tests', '<testsuites tests="2" skipped="2"></testsuites>', '<!doctype html><html></html>'],
    ['missing Odhín report', '<testsuites tests="1"><testcase /></testsuites>', undefined],
    ['empty Odhín report', '<testsuites tests="1"><testcase /></testsuites>', ''],
    [
      'Odhín fallback report',
      '<testsuites tests="1"><testcase /></testsuites>',
      '<html data-hmc-odhin-fallback="true"></html>',
    ],
  ])('rejects %s', (_caseName, junit, odhin) => {
    if (junit !== undefined) {
      fs.writeFileSync(path.join(reportDir, 'playwright-junit.xml'), junit);
    }
    if (odhin !== undefined) {
      fs.writeFileSync(path.join(reportDir, 'hmc-playwright-functional.html'), odhin);
    }

    expect(() => verifyFunctionalReport({ reportDir })).toThrow();
  });
});

describe('inherited functional aliases', () => {
  const root = path.resolve(__dirname, '../../../..');
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  let project: string;

  function aliasEnvironment(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      PATH: `${project}${path.delimiter}${process.env.PATH}`,
      FAKE_EXIT: '0',
      FAKE_REPORT: 'valid',
      YARN_IGNORE_PATH: '1',
      PLAYWRIGHT_REPORT_FOLDER: path.join(project, 'reports'),
      PLAYWRIGHT_OUTPUT_DIR: path.join(project, 'results'),
      PLAYWRIGHT_JUNIT_OUTPUT: path.join(project, 'reports/playwright-junit.xml'),
      PLAYWRIGHT_REPORT_INDEX_FILENAME: 'hmc-playwright-functional.html',
    };
  }

  beforeEach(() => {
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'hmc-functional-alias-'));
    fs.writeFileSync(
      path.join(project, 'package.json'),
      JSON.stringify({ name: 'alias-proof', packageManager: packageJson.packageManager, scripts: packageJson.scripts })
    );
    fs.writeFileSync(path.join(project, 'yarn.lock'), '');
    const install = spawnSync(
      process.execPath,
      [path.join(root, '.yarn/releases/yarn-4.15.0.cjs'), 'install', '--mode=skip-build'],
      {
        cwd: project,
        env: {
          ...process.env,
          YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
          YARN_GLOBAL_FOLDER: path.join(project, '.yarn-global'),
        },
        encoding: 'utf8',
      }
    );
    if (install.status !== 0) {
      throw new Error(install.stdout + install.stderr);
    }
    for (const file of [
      'bin/ensure-odhin-report.js',
      'bin/verify-playwright-functional-report.js',
      'playwright/reporters/odhin-filename.cjs',
    ]) {
      fs.mkdirSync(path.dirname(path.join(project, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(project, file));
    }
    fs.writeFileSync(
      path.join(project, 'npx'),
      `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
fs.appendFileSync('invocations.jsonl', JSON.stringify(process.argv.slice(2)) + '\\n');
const dir = process.env.PLAYWRIGHT_REPORT_FOLDER;
fs.mkdirSync(dir, { recursive: true });
if (process.env.FAKE_REPORT !== 'missing') {
  fs.writeFileSync(process.env.PLAYWRIGHT_JUNIT_OUTPUT, process.env.FAKE_REPORT === 'skipped' ? '<testsuites tests="1" skipped="1"/>' : '<testsuites tests="1"><testcase/></testsuites>');
  fs.writeFileSync(path.join(dir, process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME), '<html>Native report</html>');
}
process.exit(Number(process.env.FAKE_EXIT || 0));
`,
      { mode: 0o755 }
    );
  });

  afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

  test.each(['test:functional', 'test:fullfunctional'])(
    '%s executes native once with forwarded arguments and original failure',
    alias => {
      for (const exit of [0, 7]) {
        const receipt = path.join(project, 'invocations.jsonl');
        fs.rmSync(receipt, { force: true });
        const result = spawnSync(
          process.execPath,
          [path.join(root, '.yarn/releases/yarn-4.15.0.cjs'), 'run', alias, '--', '--grep', '@ticket:EXUI-5428'],
          {
            cwd: project,
            env: { ...aliasEnvironment(), FAKE_EXIT: String(exit) },
            encoding: 'utf8',
          }
        );
        expect({ status: result.status, error: result.stderr }).toEqual({ status: exit, error: '' });
        expect(
          fs
            .readFileSync(receipt, 'utf8')
            .trim()
            .split('\n')
            .map(line => JSON.parse(line))
        ).toEqual([['playwright', 'test', '--config=playwright.functional.config.ts', '--grep', '@ticket:EXUI-5428']]);
        expect(result.stdout).toContain('Verified 1 Playwright test result(s)');
      }
    }
  );

  test.each(['missing', 'skipped'])('rejects %s reports through the inherited functional alias', report => {
    const result = spawnSync(
      process.execPath,
      [path.join(root, '.yarn/releases/yarn-4.15.0.cjs'), 'run', 'test:functional'],
      {
        cwd: project,
        env: { ...aliasEnvironment(), FAKE_REPORT: report },
        encoding: 'utf8',
      }
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('verify-playwright-functional-report:');
  });

  test('preserves external evidence when report paths and fake outcomes are inherited', () => {
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'hmc-external-evidence-'));
    const sentinel = path.join(external, 'receipt.txt');
    fs.writeFileSync(sentinel, 'Existing evidence');
    const inheritedEnv = jest.replaceProperty(process, 'env', {
      ...process.env,
      PLAYWRIGHT_REPORT_FOLDER: external,
      PLAYWRIGHT_OUTPUT_DIR: external,
      PLAYWRIGHT_JUNIT_OUTPUT: sentinel,
      PLAYWRIGHT_REPORT_INDEX_FILENAME: 'receipt.txt',
      FAKE_EXIT: '99',
      FAKE_REPORT: 'missing',
    });
    try {
      const result = spawnSync(
        process.execPath,
        [path.join(root, '.yarn/releases/yarn-4.15.0.cjs'), 'run', 'test:functional'],
        {
          cwd: project,
          env: aliasEnvironment(),
          encoding: 'utf8',
        }
      );
      expect(fs.readFileSync(sentinel, 'utf8')).toBe('Existing evidence');
      expect(result.status).toBe(0);
    } finally {
      inheritedEnv.restore();
      fs.rmSync(external, { recursive: true, force: true });
    }
  });
});
