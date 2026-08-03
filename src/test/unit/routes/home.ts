import { Application, Request, Response } from 'express';

import homeRoute from '../../../main/routes/home';

type RouteHandler = (req: Request, res: Response) => void;
type RegisteredRoute = [string, ...unknown[]];

describe('Home route', () => {
  let get: jest.Mock<void, RegisteredRoute>;
  let post: jest.Mock<void, RegisteredRoute>;
  let app: Application;

  beforeEach(() => {
    get = jest.fn<void, RegisteredRoute>();
    post = jest.fn<void, RegisteredRoute>();
    app = { get, post } as unknown as Application;

    homeRoute(app);
  });

  test('registers the home page route', () => {
    expect(get).toHaveBeenCalledWith('/', expect.any(Function));
  });

  test('renders the home page on GET', () => {
    const handler = get.mock.calls[0][1] as RouteHandler;
    const render = jest.fn();
    const res = { render } as unknown as Response;

    handler({} as Request, res);

    expect(render).toHaveBeenCalledWith('home');
  });

  test('registers the continue action route', () => {
    expect(post).toHaveBeenCalledWith('/', expect.any(Function));
  });

  test('redirects back to the home page on POST', () => {
    const handler = post.mock.calls[0][1] as RouteHandler;
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;

    handler({ body: { requestType: 'singular' } } as Request, res);

    expect(redirect).toHaveBeenCalledWith(303, '/');
  });

  test('redirects bulk requests to the bulk upload page on POST', () => {
    const handler = post.mock.calls[0][1] as RouteHandler;
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;

    handler({ body: { requestType: 'bulk' } } as Request, res);

    expect(redirect).toHaveBeenCalledWith(303, '/bulk-upload');
  });

  test('registers the bulk upload page route', () => {
    expect(get).toHaveBeenCalledWith('/bulk-upload', expect.any(Function));
  });

  test('renders the bulk upload page on GET', () => {
    const handler = get.mock.calls[1][1] as RouteHandler;
    const render = jest.fn();
    const res = { render } as unknown as Response;

    handler({} as Request, res);

    expect(render).toHaveBeenCalledWith('bulk-upload');
  });

  test('registers the bulk upload action route', () => {
    expect(post).toHaveBeenCalledWith('/bulk-upload', expect.any(Function), expect.any(Function));
  });

  test('redirects to the bulk upload response page on bulk upload POST', () => {
    const handler = post.mock.calls[1][2] as RouteHandler;
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;
    const req = {
      file: {
        buffer: Buffer.from(
          'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,CANCELLED,Incident,final_state_transition'
        ),
      },
      session: {},
    } as unknown as Request;

    handler(req, res);

    expect(redirect).toHaveBeenCalledWith(303, '/bulk-upload/response');
    expect(req.session).toMatchObject({
      bulkUploadRequestJson: JSON.stringify({
        supportRequests: [
          {
            hearingId: '12345678901234567890',
            caseRef: '1234567890123456',
            action: 'CANCELLED',
            notes: 'Incident',
            state: 'final_state_transition',
          },
        ],
      }),
      bulkUploadResponseCsv: expect.stringContaining(
        '12345678901234567890,1234567890123456,CANCELLED,final_state_transition,success,Request accepted for processing'
      ),
    });
  });

  test('renders an error when no file is uploaded', () => {
    const handler = post.mock.calls[1][2] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));
    const res = { status } as unknown as Response;

    handler({ session: {} } as Request, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith('bulk-upload', {
      errors: [{ message: 'A file must be uploaded.' }],
    });
  });

  test('registers the bulk upload response route', () => {
    expect(get).toHaveBeenCalledWith('/bulk-upload/response', expect.any(Function));
  });

  test('renders the bulk upload response page on GET', () => {
    const handler = get.mock.calls[2][1] as RouteHandler;
    const render = jest.fn();
    const res = { render } as unknown as Response;

    handler({} as Request, res);

    expect(render).toHaveBeenCalledWith('bulk-upload-response');
  });

  test('registers the bulk upload response download route', () => {
    expect(get).toHaveBeenCalledWith('/bulk-upload/response/download', expect.any(Function));
  });

  test('returns the bulk upload response CSV on GET', () => {
    const handler = get.mock.calls[3][1] as RouteHandler;
    const send = jest.fn();
    const set = jest.fn(() => ({ send }));
    const status = jest.fn(() => ({ set }));
    const res = { status } as unknown as Response;
    const req = {
      session: {
        bulkUploadResponseCsv:
          'hearingId,caseRef,action,state,status,message\n12345678901234567890,1234567890123456,CANCELLED,rollback,success,Done\n',
      },
    } as unknown as Request;

    handler(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(set).toHaveBeenCalledWith({
      'Content-Disposition': 'attachment; filename="bulk-upload-response.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    });
    expect(send).toHaveBeenCalledWith(
      expect.stringContaining('12345678901234567890,1234567890123456,CANCELLED,rollback,success,Done')
    );
  });
});
