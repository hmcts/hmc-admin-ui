#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { normalizeOdhinReportFilename } = require('../playwright/reporters/odhin-filename.cjs');

const DEFAULT_REPORT_DIR = 'functional-output/tests/playwright-functional/odhin-report';
const DEFAULT_JUNIT_FILE = 'playwright-junit.xml';
const DEFAULT_ODHIN_FILE = 'hmc-playwright-functional.html';

function readRequiredFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${description}: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) {
    throw new Error(`${description} is empty: ${filePath}`);
  }

  return content;
}

function countExecutedTests(junitXml) {
  const summaryTag = junitXml.match(/<testsuites?\b[^>]*>/i)?.[0];
  const declaredCount = summaryTag?.match(/\btests=["'](\d+)["']/i)?.[1];
  const skippedCount = summaryTag?.match(/\bskipped=["'](\d+)["']/i)?.[1] ?? '0';

  if (declaredCount !== undefined) {
    return Number(declaredCount) - Number(skippedCount);
  }

  return (junitXml.match(/<testcase\b/gi) ?? []).length;
}

function verifyFunctionalReport(options = {}) {
  const reportDir = options.reportDir ?? process.env.PLAYWRIGHT_REPORT_FOLDER ?? DEFAULT_REPORT_DIR;
  const junitPath =
    options.junitPath ?? process.env.PLAYWRIGHT_JUNIT_OUTPUT ?? path.join(reportDir, DEFAULT_JUNIT_FILE);
  const reportFile = normalizeOdhinReportFilename(
    options.reportFile ?? process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME ?? DEFAULT_ODHIN_FILE
  );
  const odhinPath = options.odhinPath ?? path.join(reportDir, reportFile);
  const junitXml = readRequiredFile(junitPath, 'Playwright JUnit report');
  const odhinHtml = readRequiredFile(odhinPath, 'Odhín HTML report');
  const testCount = countExecutedTests(junitXml);

  if (!Number.isInteger(testCount) || testCount < 1) {
    throw new Error(`Playwright JUnit report contains no executed tests: ${junitPath}`);
  }
  if (!/<html[\s>]/i.test(odhinHtml)) {
    throw new Error(`Odhín HTML report is not readable HTML: ${odhinPath}`);
  }
  if (/data-hmc-odhin-fallback=["']true["']/i.test(odhinHtml)) {
    throw new Error(`Odhín reporter did not generate the required report: ${odhinPath}`);
  }

  return { junitPath, odhinPath, testCount };
}

if (require.main === module) {
  try {
    const report = verifyFunctionalReport();
    console.log(
      `Verified ${report.testCount} Playwright test result(s), JUnit=${report.junitPath}, Odhín=${report.odhinPath}`
    );
  } catch (error) {
    console.error(`verify-playwright-functional-report: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { countExecutedTests, verifyFunctionalReport };
