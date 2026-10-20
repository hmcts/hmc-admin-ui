const { normalizeOdhinReportFilename } = require('../../../../playwright/reporters/odhin-filename.cjs');

describe('normalizeOdhinReportFilename', () => {
  test('matches Odhín normalization for dotted and spaced report names', () => {
    expect(normalizeOdhinReportFilename('playwright.functional report.html')).toBe('playwright_functional_report.html');
  });
});
