import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const enhancer = require('../../../../playwright/reporters/odhin-report-enhancer.cjs') as {
  deriveFeatureName: (filePath: string, tags?: string[]) => string;
  enhanceDashboardHtml: (
    html: string,
    featureStats: unknown[],
    evidenceEntries?: unknown[],
    testMetadata?: unknown[]
  ) => string;
  enhanceGeneratedReport: (outputFolder: string, featureStats: unknown[], testMetadata?: unknown[]) => void;
};

const featureStats = [
  {
    name: 'home',
    totalTests: 4,
    durationMs: 3200,
    passed: 3,
    failed: 1,
    skipped: 0,
    timedOut: 0,
    interrupted: 0,
    flaky: 0,
  },
];

const reportShell = `<!doctype html>
<html>
  <head></head>
  <body>
    <div class="tab"></div>
    <div id="TabDashboard">
      <div class="container-fluid"><div class="row">
        <div class="dashboard-block"><div class="info-box-header">Run info</div></div>
        <div class="dashboard-block"><div class="info-box-header">Global Summary</div></div>
        <div class="dashboard-block"><div class="info-box-header">Files Summary</div></div>
        <div class="dashboard-block"><div class="info-box-header">Status by feature</div></div>
        <div class="dashboard-block"><div class="info-box-header">Status by test file</div></div>
      </div></div>
    </div>
    <table id="test-list-table">
      <thead><tr><th>Status</th></tr></thead>
      <tbody><tr data-bs-target="#test-1-0"><td>passed</td></tr></tbody>
      <tfoot><tr><th>Status</th></tr></tfoot>
    </table>
    <canvas id="chart-file"></canvas>
    <script>var ctxFile = document.getElementById('chart-file').getContext('2d'); var chartFile = new Chart(ctxFile, { data: {} });</script>
    <script>$("#test-list-table").DataTable({});</script>
  </body>
</html>`;

describe('Odhín report enhancer', () => {
  test('adds the WebApp dashboard style and feature overview', () => {
    const html = enhancer.enhanceDashboardHtml(
      reportShell,
      featureStats,
      [],
      [{ target: '#test-1-0', feature: 'home', tags: ['<smoke>'], durationMs: 120, retry: 0 }]
    );

    expect(html).toContain('<style id="odhin-enhancer-styles">');
    expect(html).toContain('<style id="webapp-report-theme">');
    expect(html).toContain('<script id="webapp-report-ui">');
    expect(html).toContain('Feature Overview');
    expect(html).toContain('home');
    expect(html).toContain('odhin-feature-overview-card');
    expect(html).toContain('data-report-metadata>Feature');
    expect(html).toContain('data-report-metadata>Tags');
    expect(html).toContain('&lt;smoke&gt;');
    expect(html).not.toContain('Status by feature');
    expect(html).not.toContain('id="chart-file"');
    expect(html).not.toContain('ctxFile');
    expect(html).toContain('stateSave:true,stateDuration:-1');

    const rerendered = enhancer.enhanceDashboardHtml(
      html,
      featureStats,
      [],
      [{ target: '#test-1-0', feature: 'home', tags: ['<smoke>'], durationMs: 120, retry: 0 }]
    );
    expect(rerendered.match(/id="webapp-report-theme"/g) ?? []).toHaveLength(1);
    expect(rerendered.match(/id="webapp-report-ui"/g) ?? []).toHaveLength(1);
  });

  test('rewrites generated Odhín files in the report folder', () => {
    const outputFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'hmc-odhin-report-'));
    const reportPath = path.join(outputFolder, 'hmc-playwright-functional.html');
    fs.writeFileSync(reportPath, reportShell, 'utf8');

    try {
      enhancer.enhanceGeneratedReport(outputFolder, featureStats, []);
      const enhancedHtml = fs.readFileSync(reportPath, 'utf8');
      expect(enhancedHtml).toContain('Feature Overview');
      expect(enhancedHtml).toContain('odhin-enhancer-styles');
      expect(enhancedHtml).toContain('webapp-report-theme');
    } finally {
      fs.rmSync(outputFolder, { recursive: true, force: true });
    }
  });

  test('derives stable feature names for Admin UI functional specs', () => {
    expect(enhancer.deriveFeatureName('/workspace/playwright/functional/home.spec.ts')).toBe('home');
    expect(enhancer.deriveFeatureName('/workspace/playwright/functional/local-forms.spec.ts')).toBe('local-forms');
    expect(enhancer.deriveFeatureName('/workspace/playwright/functional/local/home.local.spec.ts')).toBe('home');
    expect(enhancer.deriveFeatureName('/workspace/playwright/accessibility/home.oidc.a11y.spec.ts')).toBe('home');
  });

  test('uses an explicit feature tag before the spec filename fallback', () => {
    expect(
      enhancer.deriveFeatureName('/workspace/playwright/functional/oidc/home.oidc.spec.ts', ['@feature:singular'])
    ).toBe('singular');
  });

  test('counts a flaky retry as an effective pass in the feature overview', () => {
    const html = enhancer.enhanceDashboardHtml(reportShell, [
      {
        name: 'home',
        totalTests: 1,
        durationMs: 1,
        passed: 0,
        failed: 0,
        skipped: 0,
        timedOut: 0,
        interrupted: 0,
        flaky: 1,
      },
    ]);

    expect(html).toContain('>1 (<label class="fst-italic">100.00%</label>)</td>');
  });
});
