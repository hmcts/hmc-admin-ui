import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { AxeBuilder } from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

import {
  WCAG_AA_TAGS,
  accessibilityEvidenceFilenames,
  auditPageAccessibility,
  buildAccessibilitySummaryHtml,
  buildPublishedAccessibilityEvidenceEntry,
  publishReportLevelAccessibilityEvidence,
} from '../../../../playwright/functional/accessibility';

jest.mock('@axe-core/playwright', () => ({ AxeBuilder: jest.fn() }));

describe('accessibility rules', () => {
  test('uses all WCAG A and AA tags required by the audit contract', () => {
    expect(WCAG_AA_TAGS).toEqual(expect.arrayContaining(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']));
  });
});

describe('buildAccessibilitySummaryHtml', () => {
  test('renders a readable escaped summary of violations and evidence path', () => {
    const html = buildAccessibilitySummaryHtml({
      violations: [
        {
          failureSummary: 'Use a <button> instead',
          help: 'Buttons need accessible names',
          helpUrl: 'https://example.test/help?rule=name',
          id: 'button-name',
          impact: 'critical',
          nodes: [{ target: ['#unsafe<target>'] }],
        },
      ],
    });

    expect(html).toContain('<h1>Accessibility audit</h1>');
    expect(html).toContain('1 violation');
    expect(html).toContain('button-name');
    expect(html).not.toContain('Use a &lt;button&gt; instead');
    expect(html).not.toContain('#unsafe&lt;target&gt;');
    expect(html).toContain('Affected elements: 1');
    expect(html).toContain('axe-results.json');
  });

  test('states when the audit has no violations', () => {
    expect(buildAccessibilitySummaryHtml({ violations: [] })).toContain('No accessibility violations were found.');
  });

  test('names each audit evidence set for the page under test', () => {
    expect(accessibilityEvidenceFilenames('final-state-validation')).toEqual({
      html: 'final-state-validation-axe-summary.html',
      json: 'final-state-validation-axe-results.json',
    });
  });
});

describe('buildPublishedAccessibilityEvidenceEntry', () => {
  test('creates the report manifest shape consumed by the Odhín enhancer', () => {
    const entry = buildPublishedAccessibilityEvidenceEntry(
      { file: '/workspace/playwright/functional/home.spec.ts', title: 'home accessibility' },
      'home-page',
      {
        violations: [
          {
            id: 'button-name',
            help: 'Buttons need accessible names',
            helpUrl: 'https://example.test/button-name',
            nodes: [{ target: ['#submit'] }, { target: ['#submit'] }],
          },
        ],
      },
      {
        html: 'home-accessibility-axe-summary.html',
        json: 'home-accessibility-axe-results.json',
      }
    );

    expect(entry).toMatchObject({
      engine: 'axe',
      feature: 'home',
      pageState: 'home-page',
      testTitle: 'home accessibility',
      violationCount: 1,
      rules: ['button-name'],
      targets: [],
    });
  });

  test('publishes report-level evidence files and manifest entries', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hmc-a11y-publication-'));
    const sourceDirectory = path.join(root, 'test-results');
    const reportDirectory = path.join(root, 'odhin-report');
    const filenames = accessibilityEvidenceFilenames('home-page');
    const previousReportFolder = process.env.PLAYWRIGHT_REPORT_FOLDER;
    process.env.PLAYWRIGHT_REPORT_FOLDER = reportDirectory;

    try {
      fs.mkdirSync(sourceDirectory, { recursive: true });
      fs.writeFileSync(path.join(sourceDirectory, filenames.html), '<html>evidence</html>');
      fs.writeFileSync(path.join(sourceDirectory, filenames.json), '{}');

      await publishReportLevelAccessibilityEvidence(
        { file: '/workspace/playwright/functional/home.spec.ts', title: 'home accessibility' },
        'home-page',
        { violations: [] },
        sourceDirectory,
        filenames
      );

      const evidenceDirectory = path.join(reportDirectory, 'accessibility-evidence');
      const manifest = JSON.parse(fs.readFileSync(path.join(evidenceDirectory, 'manifest.json'), 'utf8'));
      expect(manifest).toHaveLength(1);
      expect(fs.readdirSync(evidenceDirectory).some(name => name.endsWith('.png'))).toBe(false);
      expect(manifest[0].feature).toBe('home');
      expect(fs.readdirSync(evidenceDirectory)).toEqual(
        expect.arrayContaining([
          'manifest.json',
          expect.stringMatching(/^manifest-entry-/),
          expect.stringMatching(/\.html$/),
          expect.stringMatching(/\.json$/),
        ])
      );
    } finally {
      if (previousReportFolder === undefined) {
        delete process.env.PLAYWRIGHT_REPORT_FOLDER;
      } else {
        process.env.PLAYWRIGHT_REPORT_FOLDER = previousReportFolder;
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('auditPageAccessibility protected evidence', () => {
  test('returns original findings while excluding DOM/session data and all screenshots from both artifact copies', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hmc-a11y-private-'));
    const marker = 'synthetic-private-dom';
    const results = {
      url: marker,
      passes: [{ html: marker }],
      violations: [
        {
          id: 'image-alt',
          help: 'Images need alternative text',
          helpUrl: 'https://example.test/image-alt',
          impact: 'critical',
          nodes: [{ target: [marker], html: marker, failureSummary: marker }],
        },
      ],
    };
    (AxeBuilder as jest.MockedClass<typeof AxeBuilder>).mockImplementation(
      () =>
        ({
          withTags: () => ({ analyze: async () => results }),
        } as unknown as AxeBuilder)
    );
    const page = { screenshot: jest.fn() };
    const testInfo = {
      file: '/repo/home.spec.ts',
      title: 'home audit',
      outputPath: (name: string) => path.join(root, 'test-results', name),
      attach: jest.fn(),
    };
    const previousReportFolder = process.env.PLAYWRIGHT_REPORT_FOLDER;
    process.env.PLAYWRIGHT_REPORT_FOLDER = path.join(root, 'report');
    try {
      expect(await auditPageAccessibility(page as unknown as Page, testInfo as unknown as TestInfo)).toBe(results);
      expect(page.screenshot).not.toHaveBeenCalled();
      expect(testInfo.attach).toHaveBeenCalledTimes(2);
      const files = fs
        .readdirSync(root, { recursive: true })
        .map(name => path.join(root, String(name)))
        .filter(name => fs.statSync(name).isFile());
      expect(files.length).toBeGreaterThan(4);
      for (const file of files) {
        expect(file).not.toMatch(/\.png$/);
        expect(fs.readFileSync(file, 'utf8')).not.toContain(marker);
      }
      const saved = JSON.parse(
        fs.readFileSync(path.join(root, 'test-results/accessibility-evidence/home-page-axe-results.json'), 'utf8')
      );
      expect(saved.violations).toEqual([
        {
          id: 'image-alt',
          help: 'Images need alternative text',
          helpUrl: 'https://example.test/image-alt',
          impact: 'critical',
          affectedElements: 1,
        },
      ]);
    } finally {
      if (previousReportFolder === undefined) {
        delete process.env.PLAYWRIGHT_REPORT_FOLDER;
      } else {
        process.env.PLAYWRIGHT_REPORT_FOLDER = previousReportFolder;
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
