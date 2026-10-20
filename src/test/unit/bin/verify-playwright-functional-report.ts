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
