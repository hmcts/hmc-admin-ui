import nock from 'nock';
import request from 'supertest';

jest.mock('config', () => {
  const actual = jest.requireActual('config');
  // PropertiesVolume also uses config's prototype methods and nested data.
  return Object.defineProperty(Object.create(actual), 'get', {
    value: (key: string) => {
      if (key === 'auth.enabled') {
        return true;
      }
      if (key === 'services.hmc.url') {
        return 'http://hmc-coverage.invalid';
      }
      return actual.get(key);
    },
  });
});

jest.mock('../../main/modules/oidc', () => ({
  OidcMiddleware: class {
    enableFor = require('../support/submission').attachSyntheticOidc;
  },
}));

jest.mock('../../main/modules/service-auth', () => ({
  ServiceAuthTokenProvider: class {
    getToken(): Promise<string> {
      return Promise.resolve('synthetic-service-token');
    }
  },
}));

import { app } from '../../main/app';
import { ServiceAuthTokenProvider } from '../../main/modules/service-auth';
import {
  bulkCsv,
  bulkPayload,
  bulkResponseCsv,
  bulkServiceResponse,
  hearingForm,
  invalidBulkCsv,
  unavailableBulkResponseCsv,
  validationResponseCsv,
} from '../data/submission';
import { getCsrfToken, renderedLink, uploadCsv } from '../support/submission';

describe('EXUI-5457 controlled authenticated submission integration', () => {
  const getServiceToken = jest.spyOn(ServiceAuthTokenProvider.prototype, 'getToken');

  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect(/^127\.0\.0\.1:\d+$/);
  });

  beforeEach(() => {
    getServiceToken.mockClear();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
    jest.restoreAllMocks();
  });

  test.each(['CANCELLED', 'ADJOURNED', 'COMPLETED'])('submits final state %s through HMC', async status => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, '/singular/final-state-transition');
    const service = nock('http://hmc-coverage.invalid', {
      reqheaders: {
        authorization: 'Bearer synthetic-user-token',
        serviceauthorization: 'Bearer synthetic-service-token',
        'content-type': 'application/json',
      },
    })
      .post('/manageExceptions', {
        supportRequests: [
          {
            hearingId: hearingForm.hearingId,
            caseRef: hearingForm.caseRef,
            action: 'final_state_transition',
            notes: hearingForm.notes,
            state: status,
          },
        ],
      })
      .reply(200, {
        supportRequestResponse: [
          { hearingId: hearingForm.hearingId, status: 'SUCCESS', message: 'Transition applied' },
        ],
      });

    await agent
      .post('/singular/final-state-transition')
      .type('form')
      .send({ ...hearingForm, status, _csrf: csrfToken })
      .expect(303)
      .expect('Location', '/singular/response');
    const response = await agent.get('/singular/response').expect(200);
    expect(response.text).toContain('Final state transition request submitted');
    expect(response.text).toContain(hearingForm.hearingId);
    expect(response.text).toContain('Transition applied');
    expect(getServiceToken).toHaveBeenCalledTimes(1);
    expect(service.isDone()).toBe(true);
  });

  test('submits rollback without a state and isolates its response by session', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, '/singular/rollback');
    const service = nock('http://hmc-coverage.invalid', {
      reqheaders: {
        authorization: 'Bearer synthetic-user-token',
        serviceauthorization: 'Bearer synthetic-service-token',
      },
    })
      .post('/manageExceptions', {
        supportRequests: [
          {
            hearingId: hearingForm.hearingId,
            caseRef: hearingForm.caseRef,
            action: 'rollback',
            notes: hearingForm.notes,
          },
        ],
      })
      .reply(200, {
        supportRequestResponse: [
          { hearingId: hearingForm.hearingId, status: 'successful', message: 'Rollback applied' },
        ],
      });

    await agent
      .post('/singular/rollback')
      .type('form')
      .send({ ...hearingForm, _csrf: csrfToken })
      .expect(303)
      .expect('Location', '/singular/response');
    const response = await agent.get('/singular/response').expect(200);
    expect(response.text).toContain('Rollback request submitted');
    expect(response.text).toContain(hearingForm.hearingId);
    expect(response.text).toContain('Rollback applied');
    await request.agent(app).get('/singular/response').expect(303).expect('Location', '/');
    expect(getServiceToken).toHaveBeenCalledTimes(1);
    expect(service.isDone()).toBe(true);
  });

  test('renders an HTTP 200 business rejection as unsuccessful', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, '/singular/final-state-transition');
    const service = nock('http://hmc-coverage.invalid', {
      reqheaders: {
        authorization: 'Bearer synthetic-user-token',
        serviceauthorization: 'Bearer synthetic-service-token',
      },
    })
      .post('/manageExceptions', { supportRequests: [bulkPayload.supportRequests[0]] })
      .reply(200, {
        supportRequestResponse: [
          { hearingId: hearingForm.hearingId, status: 'FAILED', message: 'Transition rejected' },
        ],
      });
    await agent
      .post('/singular/final-state-transition')
      .type('form')
      .send({ ...hearingForm, _csrf: csrfToken })
      .expect(303)
      .expect('Location', '/singular/response');
    const response = await agent.get('/singular/response').expect(200);
    expect(response.text).toContain('Final state transition request unsuccessful');
    expect(response.text).toContain(hearingForm.hearingId);
    expect(response.text).toContain('Transition rejected');
    expect(response.text).not.toContain('govuk-panel--confirmation');
    expect(getServiceToken).toHaveBeenCalledTimes(1);
    expect(service.isDone()).toBe(true);
  });

  test('recovers from a singular HTTP 503 using the rendered retry journey', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, '/singular/final-state-transition');
    const service = nock('http://hmc-coverage.invalid', {
      reqheaders: {
        authorization: 'Bearer synthetic-user-token',
        serviceauthorization: 'Bearer synthetic-service-token',
      },
    })
      .post('/manageExceptions', { supportRequests: [bulkPayload.supportRequests[0]] })
      .reply(503, { message: 'Synthetic unavailable service' })
      .post('/manageExceptions', { supportRequests: [bulkPayload.supportRequests[0]] })
      .reply(200, {
        supportRequestResponse: [{ hearingId: hearingForm.hearingId, status: 'SUCCESS', message: 'Retry applied' }],
      });
    await agent
      .post('/singular/final-state-transition')
      .type('form')
      .send({ ...hearingForm, _csrf: csrfToken })
      .expect(303)
      .expect('Location', '/singular/problem');
    const problem = await agent.get('/singular/problem').expect(502);
    expect(problem.text).toContain('Sorry, there is a problem with the service');
    await agent.get('/singular/response').expect(303).expect('Location', '/');
    const selectionToken = await getCsrfToken(agent, renderedLink(problem.text, 'Try singular request again'));
    const selection = await agent
      .post('/singular')
      .type('form')
      .send({ _csrf: selectionToken, singularRequestType: 'final-state-transition' })
      .expect(303)
      .expect('Location', '/singular/final-state-transition');
    const retryToken = await getCsrfToken(agent, selection.headers.location);
    await agent
      .post(selection.headers.location)
      .type('form')
      .send({ ...hearingForm, _csrf: retryToken })
      .expect(303)
      .expect('Location', '/singular/response');
    const response = await agent.get('/singular/response').expect(200);
    expect(response.text).toContain('Final state transition request submitted');
    expect(response.text).toContain('Retry applied');
    expect(getServiceToken).toHaveBeenCalledTimes(2);
    expect(service.isDone()).toBe(true);
  });

  test('downloads mixed bulk results matched by hearing ID with exact CSV escaping and session isolation', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, '/bulk-upload');
    const service = nock('http://hmc-coverage.invalid', {
      reqheaders: {
        authorization: 'Bearer synthetic-user-token',
        serviceauthorization: 'Bearer synthetic-service-token',
      },
    })
      .post('/manageExceptions', bulkPayload)
      .reply(200, bulkServiceResponse);
    await uploadCsv(agent, csrfToken, bulkCsv).expect(303).expect('Location', '/bulk-upload/response');
    const response = await agent.get('/bulk-upload/response').expect(200);
    expect(response.text).toContain('Bulk request response');
    const download = await agent.get(renderedLink(response.text, 'Download response CSV')).expect(200);
    expect(download.headers['content-type']).toContain('text/csv');
    expect(download.headers['content-disposition']).toBe('attachment; filename="bulk-upload-response.csv"');
    expect(download.text).toBe(bulkResponseCsv);
    const isolated = await request.agent(app).get('/bulk-upload/response/download').expect(200);
    expect(isolated.text).toBe(unavailableBulkResponseCsv);
    expect(getServiceToken).toHaveBeenCalledTimes(1);
    expect(service.isDone()).toBe(true);
  });

  test('recovers from a bulk HTTP 503 through the rendered retry link and downloads the resubmission', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, '/bulk-upload');
    const service = nock('http://hmc-coverage.invalid', {
      reqheaders: {
        authorization: 'Bearer synthetic-user-token',
        serviceauthorization: 'Bearer synthetic-service-token',
      },
    })
      .post('/manageExceptions', bulkPayload)
      .reply(503, { message: 'Synthetic unavailable service' })
      .post('/manageExceptions', bulkPayload)
      .reply(200, bulkServiceResponse);
    await uploadCsv(agent, csrfToken, bulkCsv).expect(303).expect('Location', '/bulk-upload/problem');
    const problem = await agent.get('/bulk-upload/problem').expect(502);
    expect(problem.text).toContain('Sorry, there is a problem with the service');
    const unavailable = await agent.get('/bulk-upload/response/download').expect(200);
    expect(unavailable.text).toBe(unavailableBulkResponseCsv);
    const retryToken = await getCsrfToken(agent, renderedLink(problem.text, 'Try bulk upload again'));
    await uploadCsv(agent, retryToken, bulkCsv).expect(303).expect('Location', '/bulk-upload/response');
    const response = await agent.get('/bulk-upload/response').expect(200);
    const download = await agent.get(renderedLink(response.text, 'Download response CSV')).expect(200);
    expect(download.text).toBe(bulkResponseCsv);
    expect(getServiceToken).toHaveBeenCalledTimes(2);
    expect(service.isDone()).toBe(true);
  });

  test('rejects invalid singular input before requesting a service token or calling HMC', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, '/singular/final-state-transition');
    const response = await agent
      .post('/singular/final-state-transition')
      .type('form')
      .send({ ...hearingForm, caseRef: 'invalid', _csrf: csrfToken })
      .expect(400);
    expect(response.text).toContain('CCD Case Reference Number must be a 16-digit number');
    expect(getServiceToken).not.toHaveBeenCalled();
  });

  test('rejects an entire bulk file when one row is invalid and downloads both validation outcomes', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, '/bulk-upload');
    const response = await uploadCsv(agent, csrfToken, invalidBulkCsv).expect(400);
    expect(response.text).toContain('There were validation errors. Please check and edit the csv file and try again');
    const download = await agent
      .get(renderedLink(response.text, 'Download rejected CSV with issues again'))
      .expect(200);
    expect(download.text).toBe(validationResponseCsv);
    expect(getServiceToken).not.toHaveBeenCalled();
  });

  test('rejects a valid singular request without CSRF before token issuance or transport', async () => {
    const agent = request.agent(app);
    await agent.get('/singular/final-state-transition').expect(200);
    await agent.post('/singular/final-state-transition').type('form').send(hearingForm).expect(403);
    expect(getServiceToken).not.toHaveBeenCalled();
  });
});
