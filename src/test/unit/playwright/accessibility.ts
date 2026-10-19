import {
  accessibilityEvidenceFilenames,
  buildAccessibilitySummaryHtml,
} from '../../../../playwright/functional/accessibility';

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
    expect(html).toContain('Use a &lt;button&gt; instead');
    expect(html).toContain('#unsafe&lt;target&gt;');
    expect(html).toContain('axe-results.json');
  });

  test('states when the audit has no violations', () => {
    expect(buildAccessibilitySummaryHtml({ violations: [] })).toContain('No accessibility violations were found.');
  });

  test('names each audit evidence set for the page under test', () => {
    expect(accessibilityEvidenceFilenames('final-state-validation')).toEqual({
      html: 'final-state-validation-axe-summary.html',
      json: 'final-state-validation-axe-results.json',
      screenshot: 'final-state-validation.png',
    });
  });
});
