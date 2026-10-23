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
};

export type PublishedAccessibilityEvidenceEntry = {
  engine: 'axe';
  feature: string;
  pageState: string;
  testTitle: string;
  attachmentPrefix: string;
  htmlFileName: string;
  jsonFileName: string;
  violationCount: number;
  rules: string[];
  targets: string[];
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
  };
}

function sanitiseFileName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'accessibility'
  );
}

export function buildPublishedAccessibilityEvidenceEntry(
  testInfo: Pick<TestInfo, 'file' | 'title'>,
  evidenceName: string,
  results: AccessibilityAuditResults,
  filenames: AccessibilityEvidenceFilenames
): PublishedAccessibilityEvidenceEntry {
  const violations = results.violations ?? [];
  const feature = path
    .basename(testInfo.file)
    .replace(/\.(?:local|oidc)(?:\.a11y)?\.spec\.[^.]+$/, '')
    .replace(/\.a11y\.spec\.[^.]+$/, '')
    .replace(/\.spec\.[^.]+$/, '');
  return {
    engine: 'axe',
    feature,
    pageState: evidenceName,
    testTitle: testInfo.title,
    attachmentPrefix: evidenceName,
    htmlFileName: filenames.html,
    jsonFileName: filenames.json,
    violationCount: violations.length,
    rules: Array.from(new Set(violations.map(violation => violation.id))),
    targets: [],
  };
}

export async function publishReportLevelAccessibilityEvidence(
  testInfo: Pick<TestInfo, 'file' | 'title'>,
  evidenceName: string,
  results: AccessibilityAuditResults,
  sourceDirectory: string,
  filenames: AccessibilityEvidenceFilenames
): Promise<void> {
  const reportDirectory = path.resolve(
    process.env.PLAYWRIGHT_REPORT_FOLDER ?? 'functional-output/tests/playwright-functional/odhin-report'
  );
  const evidenceDirectory = path.join(reportDirectory, 'accessibility-evidence');
  const baseName = `${sanitiseFileName(testInfo.title)}-${sanitiseFileName(evidenceName)}`;
  const reportFilenames = {
    html: `${baseName}-${filenames.html}`,
    json: `${baseName}-${filenames.json}`,
  };
  const entry = buildPublishedAccessibilityEvidenceEntry(testInfo, evidenceName, results, reportFilenames);

  await fs.mkdir(evidenceDirectory, { recursive: true });
  await Promise.all([
    fs.copyFile(path.join(sourceDirectory, filenames.html), path.join(evidenceDirectory, reportFilenames.html)),
    fs.copyFile(path.join(sourceDirectory, filenames.json), path.join(evidenceDirectory, reportFilenames.json)),
  ]);

  const manifestPath = path.join(evidenceDirectory, 'manifest.json');
  let entries: PublishedAccessibilityEvidenceEntry[] = [];
  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (Array.isArray(parsed)) {
      entries = parsed.filter(item => item && typeof item.testTitle === 'string');
    }
  } catch {
    // A missing manifest is expected on the first accessibility audit.
  }
  entries = entries.filter(
    existing => existing.testTitle !== entry.testTitle || existing.attachmentPrefix !== entry.attachmentPrefix
  );
  await Promise.all([
    fs.writeFile(manifestPath, JSON.stringify([...entries, entry], null, 2)),
    fs.writeFile(path.join(evidenceDirectory, `manifest-entry-${baseName}.json`), JSON.stringify(entry, null, 2)),
  ]);
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
  <p>Affected elements: ${violation.nodes.length}</p>
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

  await fs.mkdir(evidenceDirectory, { recursive: true });
  await Promise.all([
    fs.writeFile(
      jsonPath,
      JSON.stringify(
        {
          violations: results.violations.map(({ id, impact, help, helpUrl, nodes }) => ({
            id,
            impact,
            help,
            helpUrl,
            affectedElements: nodes.length,
          })),
        },
        null,
        2
      ),
      'utf8'
    ),
    fs.writeFile(htmlPath, buildAccessibilitySummaryHtml(results, filenames.json), 'utf8'),
  ]);
  await Promise.all([
    testInfo.attach(`accessibility-evidence/${filenames.json}`, {
      path: jsonPath,
      contentType: 'application/json',
    }),
    testInfo.attach(`accessibility-evidence/${filenames.html}`, { path: htmlPath, contentType: 'text/html' }),
  ]);

  await publishReportLevelAccessibilityEvidence(testInfo, evidenceName, results, evidenceDirectory, filenames);

  return results;
}
