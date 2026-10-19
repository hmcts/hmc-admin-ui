#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { normalizeOdhinReportFilename } = require('../playwright/reporters/odhin-filename.cjs');

const DEFAULT_REPORT_FILE = 'hmc-playwright-functional.html';

function parseArgs(argv) {
  const options = {
    outcome: 'unknown',
    reportDir: process.env.PLAYWRIGHT_REPORT_FOLDER ?? '',
    reportFile: process.env.PLAYWRIGHT_REPORT_INDEX_FILENAME ?? DEFAULT_REPORT_FILE,
    suiteName: 'HMC Admin UI Playwright Functional Test',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index + 1];
    if (!value) continue;
    if (argv[index] === '--report-dir') options.reportDir = value;
    if (argv[index] === '--report-file') options.reportFile = value;
    if (argv[index] === '--suite-name') options.suiteName = value;
    if (argv[index] === '--outcome') options.outcome = value;
  }

  return options;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildFallbackReportHtml(options) {
  return `<!doctype html>
<html lang="en" data-hmc-odhin-fallback="true">
  <head><meta charset="utf-8"><title>${escapeHtml(options.suiteName)} report unavailable</title></head>
  <body>
    <h1>${escapeHtml(options.suiteName)}</h1>
    <p>The Odhín reporter did not generate its required HTML report.</p>
    <p>Runner outcome: ${escapeHtml(options.outcome)}.</p>
    <p>Expected report: ${escapeHtml(options.reportFile)}.</p>
  </body>
</html>`;
}

function ensureOdhinReport(options) {
  if (!options.reportDir) {
    throw new Error('Missing report directory. Pass --report-dir or set PLAYWRIGHT_REPORT_FOLDER.');
  }

  const reportFile = normalizeOdhinReportFilename(options.reportFile ?? DEFAULT_REPORT_FILE);
  const reportPath = path.join(options.reportDir, reportFile);
  if (fs.existsSync(reportPath) && fs.statSync(reportPath).size > 0) {
    return { created: false, reportPath };
  }

  fs.mkdirSync(options.reportDir, { recursive: true });
  fs.writeFileSync(reportPath, buildFallbackReportHtml({ ...options, reportFile }), 'utf8');
  return { created: true, reportPath };
}

if (require.main === module) {
  try {
    const result = ensureOdhinReport(parseArgs(process.argv.slice(2)));
    console.log(`${result.created ? 'Created' : 'Found'} Odhín report at ${result.reportPath}`);
  } catch (error) {
    console.error(`ensure-odhin-report: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { buildFallbackReportHtml, ensureOdhinReport, parseArgs };
