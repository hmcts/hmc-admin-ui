import { Application, Request, Response } from 'express';

import bulkRoute from '../../../main/routes/bulk';

type RouteHandler = (req: Request, res: Response) => void | Promise<void>;
type RegisteredRoute = [string, ...unknown[]];

describe('Bulk route', () => {
  let get: jest.Mock<void, RegisteredRoute>;
  let post: jest.Mock<void, RegisteredRoute>;
  let app: Application;

  beforeEach(() => {
    get = jest.fn<void, RegisteredRoute>();
    post = jest.fn<void, RegisteredRoute>();
    app = { get, post } as unknown as Application;

    bulkRoute(app);
  });

  test('registers and renders the bulk upload page', () => {
    expect(get).toHaveBeenCalledWith('/bulk-upload', expect.any(Function));

    const handler = get.mock.calls[0][1] as RouteHandler;
    const render = jest.fn();

    handler({} as Request, { render } as unknown as Response);

    expect(render).toHaveBeenCalledWith('bulk-upload');
  });

  test('registers the bulk upload action route', () => {
    expect(post).toHaveBeenCalledWith('/bulk-upload', expect.any(Function), expect.any(Function));
  });

  test('redirects to the bulk upload response page on bulk upload POST', async () => {
    const handler = post.mock.calls[0][2] as RouteHandler;
    const redirect = jest.fn();
    const req = {
      file: {
        buffer: Buffer.from(
          'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,Incident,CANCELLED'
        ),
      },
      session: {},
    } as unknown as Request;

    await handler(req, { redirect } as unknown as Response);

    expect(redirect).toHaveBeenCalledWith(303, '/bulk-upload/response');
    expect(req.session).toMatchObject({
      bulkUploadRequestJson: JSON.stringify({
        supportRequests: [
          {
            hearingId: '12345678901234567890',
            caseRef: '1234567890123456',
            action: 'final_state_transition',
            notes: 'Incident',
            state: 'CANCELLED',
          },
        ],
      }),
      bulkUploadResponseCsv: expect.stringContaining(
        '12345678901234567890,1234567890123456,final_state_transition,CANCELLED,success,Mock manageExceptions response processed'
      ),
    });
  });

  test('renders an error when no file is uploaded', () => {
    const handler = post.mock.calls[0][2] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));

    handler({ session: {} } as Request, { status } as unknown as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith('bulk-upload', {
      errors: [{ message: 'A file must be uploaded.' }],
    });
  });

  test('registers and renders the bulk upload response page', () => {
    expect(get).toHaveBeenCalledWith('/bulk-upload/response', expect.any(Function));

    const handler = get.mock.calls[1][1] as RouteHandler;
    const render = jest.fn();

    handler({} as Request, { render } as unknown as Response);

    expect(render).toHaveBeenCalledWith('bulk-upload-response');
  });

  test('registers the bulk upload response download route', () => {
    expect(get).toHaveBeenCalledWith('/bulk-upload/response/download', expect.any(Function));
  });

  test('returns the bulk upload response CSV on GET', () => {
    const handler = get.mock.calls[2][1] as RouteHandler;
    const send = jest.fn();
    const set = jest.fn(() => ({ send }));
    const status = jest.fn(() => ({ set }));
    const req = {
      session: {
        bulkUploadResponseCsv:
          'hearingId,caseRef,action,state,status,message\n12345678901234567890,1234567890123456,CANCELLED,rollback,success,Done\n',
      },
    } as unknown as Request;

    handler(req, { status } as unknown as Response);

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

describe('Bulk route with auth enabled', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('config');
    jest.dontMock('../../../main/services/hearing-service');
    jest.dontMock('../../../main/services/user-auth');
  });

  test('posts bulk upload payload to manageExceptions and writes its response into the CSV', async () => {
    jest.resetModules();

    const manageExceptions = jest.fn().mockResolvedValue({
      supportRequestResponse: [
        {
          hearingId: '12345678901234567890',
          status: 'error',
          message: 'Service rejected this request',
        },
      ],
    });

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

    const { default: authEnabledBulkRoute } = require('../../../main/routes/bulk');
    const get = jest.fn<void, RegisteredRoute>();
    const post = jest.fn<void, RegisteredRoute>();
    const app = { get, post } as unknown as Application;
    authEnabledBulkRoute(app);

    const handler = post.mock.calls[0][2] as RouteHandler;
    const redirect = jest.fn();
    const req = {
      file: {
        buffer: Buffer.from(
          'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,Incident,CANCELLED'
        ),
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
      bulkUploadResponseCsv: expect.stringContaining(
        '12345678901234567890,1234567890123456,final_state_transition,CANCELLED,error,Service rejected this request'
      ),
    });
    expect(redirect).toHaveBeenCalledWith(303, '/bulk-upload/response');
  });
});
