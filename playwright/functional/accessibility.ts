import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { AxeBuilder } from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

type AxeViolation = {
  failureSummary?: string;
  help: string;
  helpUrl: string;
  id: string;
  impact?: string | null;
  nodes: { target: string[] }[];
};

export type AccessibilityAuditResults = {
  violations: AxeViolation[];
};

type AccessibilityEvidenceFilenames = {
  html: string;
  json: string;
  screenshot: string;
};

export const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function accessibilityEvidenceFilenames(evidenceName: string): AccessibilityEvidenceFilenames {
  return {
    html: `${evidenceName}-axe-summary.html`,
    json: `${evidenceName}-axe-results.json`,
    screenshot: `${evidenceName}.png`,
  };
}

export function buildAccessibilitySummaryHtml(
  results: AccessibilityAuditResults,
  jsonFilename = 'axe-results.json'
): string {
  const count = results.violations.length;
  const summary = count === 1 ? '1 violation' : `${count} violations`;
  const violations = results.violations
    .map(
      violation => `<article>
  <h2>${escapeHtml(violation.id)}${violation.impact ? ` (${escapeHtml(violation.impact)})` : ''}</h2>
  <p>${escapeHtml(violation.help)}</p>
  <p><a href="${escapeHtml(violation.helpUrl)}">Rule guidance</a></p>
  <ul>${violation.nodes.map(node => `<li><code>${escapeHtml(node.target.join(' '))}</code></li>`).join('')}</ul>
  ${violation.failureSummary ? `<pre>${escapeHtml(violation.failureSummary)}</pre>` : ''}
</article>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>HMC Admin UI accessibility audit</title></head>
  <body>
    <main>
      <h1>Accessibility audit</h1>
      <p>${count ? `${summary} found.` : 'No accessibility violations were found.'}</p>
      <p>Machine-readable evidence: <code>${escapeHtml(jsonFilename)}</code>.</p>
      ${violations}
    </main>
  </body>
</html>`;
}

export async function auditPageAccessibility(
  page: Page,
  testInfo: TestInfo,
  evidenceName = 'home-page'
): Promise<AccessibilityAuditResults> {
  const results = (await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze()) as AccessibilityAuditResults;
  const evidenceDirectory = testInfo.outputPath('accessibility-evidence');
  const filenames = accessibilityEvidenceFilenames(evidenceName);
  const jsonPath = path.join(evidenceDirectory, filenames.json);
  const htmlPath = path.join(evidenceDirectory, filenames.html);
  const screenshotPath = path.join(evidenceDirectory, filenames.screenshot);

  await fs.mkdir(evidenceDirectory, { recursive: true });
  await Promise.all([
    fs.writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8'),
    fs.writeFile(htmlPath, buildAccessibilitySummaryHtml(results, filenames.json), 'utf8'),
    page.screenshot({ path: screenshotPath, fullPage: true }),
  ]);
  await Promise.all([
    testInfo.attach(`accessibility-evidence/${filenames.json}`, {
      path: jsonPath,
      contentType: 'application/json',
    }),
    testInfo.attach(`accessibility-evidence/${filenames.html}`, { path: htmlPath, contentType: 'text/html' }),
    testInfo.attach(`accessibility-evidence/${filenames.screenshot}`, {
      path: screenshotPath,
      contentType: 'image/png',
    }),
  ]);

  return results;
}
