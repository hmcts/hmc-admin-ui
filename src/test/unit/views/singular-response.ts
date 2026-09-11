import * as path from 'node:path';

import * as nunjucks from 'nunjucks';

describe('Singular response view', () => {
  let environment: nunjucks.Environment;

  beforeAll(() => {
    const govukTemplates = path.dirname(require.resolve('govuk-frontend/package.json')) + '/dist';
    const viewsPath = path.join(__dirname, '..', '..', '..', 'main', 'views');

    environment = nunjucks.configure([govukTemplates, viewsPath], {
      autoescape: true,
    });
  });

  test('renders a red GOV.UK failure message with the hearing ID', () => {
    const html = environment.render('singular-response.njk', {
      result: {
        hearingId: '12345678901234567890',
        requestType: 'final-state-transition',
        status: 'failure',
        message: 'Service rejected this request',
      },
    });

    expect(html).toContain('class="govuk-error-message" role="alert"');
    expect(html).toContain('The request was not processed for Hearing ID <strong>12345678901234567890</strong>.');
    expect(html).toContain('Service rejected this request');
    expect(html).not.toContain('govuk-warning-text');
  });
});
