import { Application, Request, Response } from 'express';

import singularRoute from '../../../main/routes/singular';

type RouteHandler = (req: Request, res: Response) => void | Promise<void>;
type RegisteredRoute = [string, ...unknown[]];

describe('Singular route', () => {
  let get: jest.Mock<void, RegisteredRoute>;
  let post: jest.Mock<void, RegisteredRoute>;
  let app: Application;

  beforeEach(() => {
    get = jest.fn<void, RegisteredRoute>();
    post = jest.fn<void, RegisteredRoute>();
    app = { get, post } as unknown as Application;

    singularRoute(app);
  });

  test('registers and renders the singular request type page', () => {
    expect(get).toHaveBeenCalledWith('/singular', expect.any(Function));

    const handler = get.mock.calls[0][1] as RouteHandler;
    const render = jest.fn();

    handler({} as Request, { render } as unknown as Response);

    expect(render).toHaveBeenCalledWith('singular', {
      errorMap: {},
      errors: [],
      form: {
        singularRequestType: '',
      },
    });
  });

  test('redirects singular request type selections on POST', () => {
    const handler = post.mock.calls[0][1] as RouteHandler;
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;

    handler({ body: { singularRequestType: 'final-state-transition' } } as Request, res);
    expect(redirect).toHaveBeenLastCalledWith(303, '/singular/final-state-transition');

    handler({ body: { singularRequestType: 'rollback' } } as Request, res);
    expect(redirect).toHaveBeenLastCalledWith(303, '/singular/rollback');
  });

  test('renders a validation error when no singular request type is selected on POST', () => {
    const handler = post.mock.calls[0][1] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));

    handler({ body: {} } as Request, { status } as unknown as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith('singular', {
      errorMap: {
        'singular-request-type': 'Select a singular request type',
      },
      errors: [{ field: 'singular-request-type', message: 'Select a singular request type' }],
      form: {
        singularRequestType: '',
      },
    });
  });

  test('renders the final state transition page on GET', () => {
    const handler = get.mock.calls[1][1] as RouteHandler;
    const render = jest.fn();

    handler({} as Request, { render } as unknown as Response);

    expect(render).toHaveBeenCalledWith('singular-final-state-transition', {
      errorMap: {},
      form: {
        hearingId: '',
        caseRef: '',
        status: '',
        notes: '',
      },
      statuses: ['CANCELLED', 'ADJOURNED', 'COMPLETED'],
    });
  });

  test('renders validation errors when final state transition mandatory fields are missing on POST', async () => {
    const handler = post.mock.calls[1][1] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));

    await handler({ body: {} } as Request, { status } as unknown as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith(
      'singular-final-state-transition',
      expect.objectContaining({
        errorMap: {
          'case-ref': 'Enter a CCD Case Reference Number',
          'hearing-id': 'Enter a hearing ID',
          status: 'Select a status',
        },
      })
    );
  });

  test('renders validation errors when final state transition field rules are broken on POST', async () => {
    const handler = post.mock.calls[1][1] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));

    await handler(
      {
        body: {
          hearingId: '1234567890123456789012345678901',
          caseRef: 'not-a-case-ref',
          status: 'INVALID',
          notes: 'a'.repeat(5001),
        },
      } as Request,
      { status } as unknown as Response
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith(
      'singular-final-state-transition',
      expect.objectContaining({
        errorMap: {
          'case-ref': 'CCD Case Reference Number must be a 16-digit number',
          'hearing-id': 'Hearing ID must be 30 characters or fewer',
          notes: 'Incident Number / Notes must be 5000 characters or fewer',
          status: 'Status must be Cancelled, Adjourned or Completed',
        },
      })
    );
  });

  test('stores a fallback failure response and redirects when final state transition submission has no service response', async () => {
    const handler = post.mock.calls[1][1] as RouteHandler;
    const redirect = jest.fn();
    const req = {
      body: {
        hearingId: '12345678901234567890',
        caseRef: '1234567890123456',
        status: 'CANCELLED',
        notes: 'Incident',
      },
      session: {},
    } as unknown as Request;

    await handler(req, { redirect } as unknown as Response);

    expect(req.session).toMatchObject({
      singularResponse: {
        hearingId: '12345678901234567890',
        requestType: 'final-state-transition',
        status: 'failure',
        message: 'No response message returned',
      },
    });
    expect(redirect).toHaveBeenCalledWith(303, '/singular/response');
  });

  test('renders the rollback page on GET', () => {
    const handler = get.mock.calls[2][1] as RouteHandler;
    const render = jest.fn();

    handler({} as Request, { render } as unknown as Response);

    expect(render).toHaveBeenCalledWith('singular-rollback', {
      errorMap: {},
      form: {
        hearingId: '',
        caseRef: '',
        status: '',
        notes: '',
      },
      statuses: ['CANCELLED', 'ADJOURNED', 'COMPLETED'],
    });
  });

  test('renders validation errors when rollback mandatory fields are missing on POST', async () => {
    const handler = post.mock.calls[2][1] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));

    await handler({ body: {} } as Request, { status } as unknown as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith(
      'singular-rollback',
      expect.objectContaining({
        errorMap: {
          'case-ref': 'Enter a CCD Case Reference Number',
          'hearing-id': 'Enter a hearing ID',
        },
      })
    );
  });

  test('renders validation errors when rollback field rules are broken on POST', async () => {
    const handler = post.mock.calls[2][1] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));

    await handler(
      {
        body: {
          hearingId: '1234567890123456789012345678901',
          caseRef: 'not-a-case-ref',
          notes: 'a'.repeat(5001),
        },
      } as Request,
      { status } as unknown as Response
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith(
      'singular-rollback',
      expect.objectContaining({
        errorMap: {
          'case-ref': 'CCD Case Reference Number must be a 16-digit number',
          'hearing-id': 'Hearing ID must be 30 characters or fewer',
          notes: 'Incident Number / Notes must be 5000 characters or fewer',
        },
      })
    );
  });

  test('stores a fallback failure response and redirects when rollback submission has no service response', async () => {
    const handler = post.mock.calls[2][1] as RouteHandler;
    const redirect = jest.fn();
    const req = {
      body: {
        hearingId: '12345678901234567890',
        caseRef: '1234567890123456',
        notes: 'Incident',
      },
      session: {},
    } as unknown as Request;

    await handler(req, { redirect } as unknown as Response);

    expect(req.session).toMatchObject({
      singularResponse: {
        hearingId: '12345678901234567890',
        requestType: 'rollback',
        status: 'failure',
        message: 'No response message returned',
      },
    });
    expect(redirect).toHaveBeenCalledWith(303, '/singular/response');
  });

  test('renders the singular response page from session', () => {
    const handler = get.mock.calls[4][1] as RouteHandler;
    const render = jest.fn();
    const req = {
      session: {
        singularResponse: {
          hearingId: '12345678901234567890',
          requestType: 'final-state-transition',
          status: 'success',
          message: 'Done',
        },
      },
    } as unknown as Request;

    handler(req, { render } as unknown as Response);

    expect(render).toHaveBeenCalledWith('singular-response', {
      result: {
        hearingId: '12345678901234567890',
        requestType: 'final-state-transition',
        status: 'success',
        message: 'Done',
      },
    });
  });

  test('redirects to the homepage when no singular response is stored', () => {
    const handler = get.mock.calls[4][1] as RouteHandler;
    const redirect = jest.fn();

    handler({ session: {} } as Request, { redirect } as unknown as Response);

    expect(redirect).toHaveBeenCalledWith(303, '/');
  });
});

describe('Singular route with auth enabled', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('config');
    jest.dontMock('../../../main/services/hearing-service');
    jest.dontMock('../../../main/services/user-auth');
  });

  function loadAuthEnabledSingularRoute(manageExceptions: jest.Mock) {
    jest.resetModules();

    jest.doMock('config', () => ({
      get: jest.fn((key: string) => {
        if (key === 'auth.enabled') {
          return true;
        }

        return undefined;
      }),
    }));
    jest.doMock('../../../main/services/hearing-service', () => ({
      HearingService: jest.fn(() => ({ manageExceptions })),
    }));
    jest.doMock('../../../main/services/user-auth', () => ({
      getUserAccessToken: jest.fn(() => 'user-token'),
    }));

    const { default: authEnabledSingularRoute } = require('../../../main/routes/singular');
    const get = jest.fn<void, RegisteredRoute>();
    const post = jest.fn<void, RegisteredRoute>();
    const app = { get, post } as unknown as Application;
    authEnabledSingularRoute(app);

    return { post };
  }

  test('posts final state transition payload to manageExceptions', async () => {
    const manageExceptions = jest.fn().mockResolvedValue({
      supportRequestResponse: [
        {
          hearingId: '12345678901234567890',
          status: 'success',
          message: 'Done',
        },
      ],
    });
    const { post } = loadAuthEnabledSingularRoute(manageExceptions);
    const handler = post.mock.calls[1][1] as RouteHandler;
    const redirect = jest.fn();
    const req = {
      body: {
        hearingId: '12345678901234567890',
        caseRef: '1234567890123456',
        status: 'CANCELLED',
        notes: 'Incident',
      },
      session: {},
    } as unknown as Request;

    await handler(req, { redirect } as unknown as Response);

    expect(manageExceptions).toHaveBeenCalledWith(
      {
        supportRequests: [
          {
            hearingId: '12345678901234567890',
            caseRef: '1234567890123456',
            action: 'final_state_transition',
            notes: 'Incident',
            state: 'CANCELLED',
          },
        ],
      },
      'user-token'
    );
    expect(req.session).toMatchObject({
      singularResponse: {
        hearingId: '12345678901234567890',
        requestType: 'final-state-transition',
        status: 'success',
        message: 'Done',
      },
    });
    expect(redirect).toHaveBeenCalledWith(303, '/singular/response');
  });

  test('posts rollback payload to manageExceptions', async () => {
    const manageExceptions = jest.fn().mockResolvedValue({
      supportRequestResponse: [
        {
          hearingId: '12345678901234567890',
          status: 'success',
          message: 'Done',
        },
      ],
    });
    const { post } = loadAuthEnabledSingularRoute(manageExceptions);
    const handler = post.mock.calls[2][1] as RouteHandler;
    const redirect = jest.fn();
    const req = {
      body: {
        hearingId: '12345678901234567890',
        caseRef: '1234567890123456',
        notes: 'Incident',
      },
      session: {},
    } as unknown as Request;

    await handler(req, { redirect } as unknown as Response);

    expect(manageExceptions).toHaveBeenCalledWith(
      {
        supportRequests: [
          {
            hearingId: '12345678901234567890',
            caseRef: '1234567890123456',
            action: 'rollback',
            notes: 'Incident',
            state: undefined,
          },
        ],
      },
      'user-token'
    );
    expect(req.session).toMatchObject({
      singularResponse: {
        hearingId: '12345678901234567890',
        requestType: 'rollback',
        status: 'success',
        message: 'Done',
      },
    });
    expect(redirect).toHaveBeenCalledWith(303, '/singular/response');
  });

  test('stores a failure response when manageExceptions returns a failed hearing result', async () => {
    const manageExceptions = jest.fn().mockResolvedValue({
      supportRequestResponse: [
        {
          hearingId: '12345678901234567890',
          status: 'error',
          message: 'Service rejected this request',
        },
      ],
    });
    const { post } = loadAuthEnabledSingularRoute(manageExceptions);
    const handler = post.mock.calls[1][1] as RouteHandler;
    const redirect = jest.fn();
    const req = {
      body: {
        hearingId: '12345678901234567890',
        caseRef: '1234567890123456',
        status: 'CANCELLED',
        notes: 'Incident',
      },
      session: {},
    } as unknown as Request;

    await handler(req, { redirect } as unknown as Response);

    expect(req.session).toMatchObject({
      singularResponse: {
        hearingId: '12345678901234567890',
        requestType: 'final-state-transition',
        status: 'failure',
        message: 'Service rejected this request',
      },
    });
    expect(redirect).toHaveBeenCalledWith(303, '/singular/response');
  });

  test('redirects to the singular problem page when manageExceptions rejects a singular request', async () => {
    const manageExceptions = jest.fn().mockRejectedValue(new Error('Service unavailable'));
    const { post } = loadAuthEnabledSingularRoute(manageExceptions);
    const handler = post.mock.calls[1][1] as RouteHandler;
    const redirect = jest.fn();

    await handler(
      {
        body: {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          status: 'CANCELLED',
          notes: 'Incident',
        },
      } as Request,
      { redirect } as unknown as Response
    );

    expect(manageExceptions).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(303, '/singular/problem');
  });
});
