const fs = require('fs');
const path = require('path');

const reportsDir = path.resolve(__dirname, '..', 'functional-output', 'functional', 'reports');
const outputDir = path.resolve(__dirname, '..', 'functional-output', 'functional', 'html-report');
const outputPath = path.join(outputDir, 'test-report.html');

const statusClassNames = {
  broken: 'failed',
  failed: 'failed',
  passed: 'passed',
  pending: 'pending',
  skipped: 'pending',
};

function decodeXml(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAttribute(tag, attributeName) {
  const match = tag.match(new RegExp(`${attributeName}=['"]([^'"]*)['"]`));
  return match ? decodeXml(match[1]) : '';
}

function formatDuration(start, stop) {
  const durationMs = Number(stop) - Number(start);

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return '';
  }

  return `${(durationMs / 1000).toFixed(3)}s`;
}

function formatTimestamp(start) {
  const timestamp = Number(start);

  if (!Number.isFinite(timestamp)) {
    return 'Not available';
  }

  return new Date(timestamp).toLocaleString('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    year: 'numeric',
  });
}

function getFirstTagValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`));
  return match ? decodeXml(match[1].trim()) : '';
}

function parseReport(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const suiteTag = xml.match(/<[^>]*test-suite\b[^>]*>/)?.[0] || '';
  const suiteName = getFirstTagValue(xml, 'title') || getFirstTagValue(xml, 'name') || path.basename(filePath);
  const start = getAttribute(suiteTag, 'start');
  const stop = getAttribute(suiteTag, 'stop');
  const testCases = [];
  const testCaseRegex = /<test-case\b([^>]*)>([\s\S]*?)<\/test-case>/g;

  for (const match of xml.matchAll(testCaseRegex)) {
    const attributes = match[1];
    const body = match[2];
    const status = getAttribute(attributes, 'status') || 'unknown';
    const caseStart = getAttribute(attributes, 'start');
    const caseStop = getAttribute(attributes, 'stop');

    testCases.push({
      duration: formatDuration(caseStart, caseStop),
      message: getFirstTagValue(body, 'message'),
      name: getFirstTagValue(body, 'title') || getFirstTagValue(body, 'name') || 'Unnamed scenario',
      status,
    });
  }

  return {
    duration: formatDuration(start, stop),
    fileName: path.basename(filePath),
    start,
    suiteName,
    testCases,
  };
}

function readReports() {
  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  return fs
    .readdirSync(reportsDir)
    .filter(fileName => fileName.endsWith('-testsuite.xml'))
    .map(fileName => parseReport(path.join(reportsDir, fileName)))
    .sort((left, right) => Number(left.start || 0) - Number(right.start || 0));
}

function countTests(suites) {
  return suites
    .flatMap(suite => suite.testCases)
    .reduce(
      (summary, testCase) => {
        const status = statusClassNames[testCase.status] || 'failed';
        summary.total += 1;
        summary[status] += 1;
        return summary;
      },
      { failed: 0, passed: 0, pending: 0, total: 0 }
    );
}

function summaryItem(label, value, className) {
  const emptyClassName = value === 0 ? ' summary-empty' : '';
  return `<div class="summary-${className}${emptyClassName}">${value} ${label}</div>`;
}

function renderReport(suites) {
  const tests = countTests(suites);
  const suiteSummary = suites.reduce(
    (summary, suite) => {
      const hasFailedTest = suite.testCases.some(testCase => statusClassNames[testCase.status] === 'failed');
      const hasPendingTest = suite.testCases.some(testCase => statusClassNames[testCase.status] === 'pending');

      summary.total += 1;
      if (hasFailedTest) {
        summary.failed += 1;
      } else if (hasPendingTest) {
        summary.pending += 1;
      } else {
        summary.passed += 1;
      }

      return summary;
    },
    { failed: 0, passed: 0, pending: 0, total: 0 }
  );
  const firstStart = suites.find(suite => suite.start)?.start;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Functional Test Report</title>
  <style>
    body { color: #0b0c0c; font-family: Arial, sans-serif; margin: 0; background: #f3f2f1; }
    .content { margin: 0 auto; max-width: 1100px; padding: 32px 24px; }
    header { background: #1d70b8; color: #fff; margin: -32px -24px 24px; padding: 24px; }
    h1 { font-size: 32px; margin: 0; }
    #timestamp { margin-top: 8px; }
    #summary { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
    .summary-group { background: #fff; border-left: 6px solid #1d70b8; padding: 16px; min-width: 240px; }
    .summary-total { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .summary-passed { color: #00703c; }
    .summary-failed { color: #d4351c; }
    .summary-pending { color: #505a5f; }
    .summary-empty { color: #6f777b; }
    .suite-container { background: #fff; border: 1px solid #b1b4b6; margin-bottom: 16px; }
    .suite-header { align-items: center; border-bottom: 1px solid #b1b4b6; display: flex; justify-content: space-between; padding: 12px 16px; }
    .suite-path { font-weight: 700; }
    .suite-time, .test-duration { color: #505a5f; white-space: nowrap; }
    .test-result { border-top: 1px solid #d8dde0; padding: 12px 16px; }
    .test-result:first-child { border-top: 0; }
    .test-info { display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr) auto auto; }
    .test-title { overflow-wrap: anywhere; }
    .test-status { border-radius: 2px; color: #fff; font-size: 13px; font-weight: 700; padding: 3px 8px; text-transform: uppercase; }
    .passed .test-status { background: #00703c; }
    .failed .test-status { background: #d4351c; }
    .pending .test-status { background: #505a5f; }
    .test-message { background: #f3f2f1; color: #d4351c; margin-top: 12px; overflow-x: auto; padding: 12px; white-space: pre-wrap; }
    .empty-state { background: #fff; border: 1px solid #b1b4b6; padding: 16px; }
  </style>
</head>
<body>
  <div class="content">
    <header>
      <h1>Functional Test Report</h1>
      <div id="timestamp">Started: ${escapeHtml(formatTimestamp(firstStart))}</div>
    </header>
    <div id="summary">
      <div class="summary-group">
        <div class="summary-total">Suites (${suiteSummary.total})</div>
        ${summaryItem('passed', suiteSummary.passed, 'passed')}
        ${summaryItem('failed', suiteSummary.failed, 'failed')}
        ${summaryItem('pending', suiteSummary.pending, 'pending')}
      </div>
      <div class="summary-group">
        <div class="summary-total">Tests (${tests.total})</div>
        ${summaryItem('passed', tests.passed, 'passed')}
        ${summaryItem('failed', tests.failed, 'failed')}
        ${summaryItem('pending', tests.pending, 'pending')}
      </div>
    </div>
    ${
      suites.length === 0
        ? '<div class="empty-state">No functional test XML reports were found.</div>'
        : suites
            .map(
              (suite, suiteIndex) => `<div id="suite-${suiteIndex + 1}" class="suite-container">
      <div class="suite-header">
        <div class="suite-path">${escapeHtml(suite.suiteName)}</div>
        <div class="suite-time">${escapeHtml(suite.duration)}</div>
      </div>
      <div class="suite-tests">
        ${suite.testCases
          .map(testCase => {
            const className = statusClassNames[testCase.status] || 'failed';
            return `<div class="test-result ${className}">
          <div class="test-info">
            <div class="test-title">${escapeHtml(testCase.name)}</div>
            <div class="test-status">${escapeHtml(testCase.status)}</div>
            <div class="test-duration">${escapeHtml(testCase.duration)}</div>
          </div>
          ${testCase.message ? `<pre class="test-message">${escapeHtml(testCase.message)}</pre>` : ''}
        </div>`;
          })
          .join('')}
      </div>
    </div>`
            )
            .join('')
    }
  </div>
</body>
</html>
`;
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, renderReport(readReports()));
console.log(`Functional test HTML report written to ${path.relative(process.cwd(), outputPath)}`);
