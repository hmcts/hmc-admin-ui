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

    expect(render).toHaveBeenCalledWith('singular');
  });

  test('redirects singular request type selections on POST', () => {
    const handler = post.mock.calls[0][1] as RouteHandler;
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;

    handler({ body: { singularRequestType: 'final-state-transition' } } as Request, res);
    expect(redirect).toHaveBeenLastCalledWith(303, '/singular/final-state-transition');

    handler({ body: { singularRequestType: 'rollback' } } as Request, res);
    expect(redirect).toHaveBeenLastCalledWith(303, '/singular/rollback');

    handler({ body: {} } as Request, res);
    expect(redirect).toHaveBeenLastCalledWith(303, '/singular');
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

  test('renders a success message when final state transition submission is valid on POST', async () => {
    const handler = post.mock.calls[1][1] as RouteHandler;
    const render = jest.fn();

    await handler(
      {
        body: {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          status: 'CANCELLED',
          notes: 'Incident',
        },
      } as Request,
      { render } as unknown as Response
    );

    expect(render).toHaveBeenCalledWith(
      'singular-final-state-transition',
      expect.objectContaining({
        successMessage: 'Final state transition was successful.',
      })
    );
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

  test('renders a success message when rollback submission is valid on POST', async () => {
    const handler = post.mock.calls[2][1] as RouteHandler;
    const render = jest.fn();

    await handler(
      {
        body: {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          notes: 'Incident',
        },
      } as Request,
      { render } as unknown as Response
    );

    expect(render).toHaveBeenCalledWith(
      'singular-rollback',
      expect.objectContaining({
        successMessage: 'Rollback was successful.',
      })
    );
  });
});
