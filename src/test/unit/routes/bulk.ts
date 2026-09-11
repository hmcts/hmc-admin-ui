import { Application, Request, Response } from 'express';
import multer from 'multer';

import bulkRoute, { handleUploadError, hasCsvContent, isAllowedCsvFile, uploadLimits } from '../../../main/routes/bulk';

type RouteHandler = (req: Request, res: Response) => void | Promise<void>;
type RegisteredRoute = [string, ...unknown[]];

function getBulkUploadResponseCsv(req: Request): string {
  return (req.session as unknown as { bulkUploadResponseCsv: string }).bulkUploadResponseCsv;
}

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

  test('configures multer upload limits', () => {
    expect(uploadLimits).toEqual({
      fileSize: 10 * 1024 * 1024,
      files: 1,
      parts: 6,
      fields: 5,
      fieldNameSize: 100,
      fieldSize: 1024 * 1024,
    });
  });

  test('allows CSV upload files only when extension and MIME type match', () => {
    expect(isAllowedCsvFile({ originalname: 'bulk-upload.csv', mimetype: 'text/csv' })).toBe(true);
    expect(isAllowedCsvFile({ originalname: 'bulk-upload.txt', mimetype: 'text/csv' })).toBe(false);
    expect(isAllowedCsvFile({ originalname: 'bulk-upload.csv', mimetype: 'text/plain' })).toBe(false);
  });

  test('validates CSV content before parsing', () => {
    expect(
      hasCsvContent({
        buffer: Buffer.from(
          'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,Incident,CANCELLED'
        ),
      })
    ).toBe(true);
    expect(hasCsvContent({ buffer: Buffer.from([0x00, 0x01, 0x02, 0x03]) })).toBe(false);
    expect(hasCsvContent({ buffer: Buffer.from('not a csv file') })).toBe(false);
  });

  test('renders a validation error when multer rejects file size', () => {
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));
    const res = { status } as unknown as Response;
    const next = jest.fn();

    handleUploadError(new multer.MulterError('LIMIT_FILE_SIZE'), res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith('bulk-upload', {
      errors: [{ message: 'The selected file must be smaller than 10MB.' }],
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('passes unexpected upload errors to the next error handler', () => {
    const res = {} as Response;
    const next = jest.fn();
    const error = new Error('Unexpected upload failure');

    handleUploadError(error, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('redirects to the bulk upload response page on bulk upload POST', async () => {
    const handler = post.mock.calls[0][2] as RouteHandler;
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;
    const req = {
      file: {
        buffer: Buffer.from(
          'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,Incident,CANCELLED'
        ),
      },
      session: {},
    } as unknown as Request;

    await handler(req, res);

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
        '12345678901234567890,1234567890123456,final_state_transition,CANCELLED,UNKNOWN,No response message returned'
      ),
    });
    expect(getBulkUploadResponseCsv(req)).not.toContain('Validation Issue');
  });

  test('renders the upload page and downloads a validation CSV when uploaded CSV rows have validation issues', async () => {
    const handler = post.mock.calls[0][2] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));
    const res = { status } as unknown as Response;
    const req = {
      file: {
        buffer: Buffer.from('hearingId,caseRef,action,notes,state\n12345678901234567890,not-a-case-ref,rollback,,'),
      },
      session: {},
    } as unknown as Request;

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith('bulk-upload', {
      downloadValidationResponse: true,
      errors: [{ message: 'There were validation errors. Please check and edit the csv file and try again' }],
    });
    expect(req.session).toMatchObject({
      bulkUploadRequestJson: JSON.stringify({
        supportRequests: [],
      }),
      bulkUploadResponseCsv: expect.stringContaining(
        '12345678901234567890,not-a-case-ref,rollback,,INVALID,Validation failed,Case Reference Number must be a 16-digit numeric value.'
      ),
    });
    expect(getBulkUploadResponseCsv(req)).toContain('Validation Issue');
  });

  test('renders an error when no file is uploaded', () => {
    const handler = post.mock.calls[0][2] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));
    const res = { status } as unknown as Response;

    handler({ session: {} } as Request, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith('bulk-upload', {
      errors: [{ message: 'A file must be uploaded.' }],
    });
  });

  test('renders an error when uploaded file content is not CSV', () => {
    const handler = post.mock.calls[0][2] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));
    const res = { status } as unknown as Response;
    const req = {
      file: {
        buffer: Buffer.from('not a csv file'),
      },
      session: {},
    } as unknown as Request;

    handler(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith('bulk-upload', {
      errors: [{ message: 'The selected file must be a valid CSV file.' }],
    });
  });

  test('renders a general file error when uploaded CSV headers are invalid', () => {
    const handler = post.mock.calls[0][2] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));
    const res = { status } as unknown as Response;
    const req = {
      file: {
        buffer: Buffer.from('hearingId,caseRef,action,notes,state,unexpected\n123,1234567890123456,rollback,,,extra'),
      },
      session: {},
    } as unknown as Request;

    handler(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(render).toHaveBeenCalledWith('bulk-upload', {
      errors: [{ message: 'There is a problem with the file. Check the file has the correct header layout.' }],
    });
  });

  test('registers and renders the bulk upload response page', () => {
    expect(get).toHaveBeenCalledWith('/bulk-upload/response', expect.any(Function));

    const handler = get.mock.calls[1][1] as RouteHandler;
    const render = jest.fn();

    handler({} as Request, { render } as unknown as Response);

    expect(render).toHaveBeenCalledWith('bulk-upload-response');
  });

  test('registers and renders the bulk upload problem page', () => {
    expect(get).toHaveBeenCalledWith('/bulk-upload/problem', expect.any(Function));

    const handler = get.mock.calls[2][1] as RouteHandler;
    const render = jest.fn();
    const status = jest.fn(() => ({ render }));

    handler({} as Request, { status } as unknown as Response);

    expect(status).toHaveBeenCalledWith(502);
    expect(render).toHaveBeenCalledWith('bulk-upload-problem');
  });

  test('returns the bulk upload response CSV on GET', () => {
    expect(get).toHaveBeenCalledWith('/bulk-upload/response/download', expect.any(Function));

    const handler = get.mock.calls[3][1] as RouteHandler;
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
    const res = { redirect } as unknown as Response;
    const req = {
      file: {
        buffer: Buffer.from(
          'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,Incident,CANCELLED'
        ),
      },
      session: {},
    } as unknown as Request;

    await handler(req, res);

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
    expect(getBulkUploadResponseCsv(req)).not.toContain('Validation Issue');
    expect(redirect).toHaveBeenCalledWith(303, '/bulk-upload/response');
  });

  test('redirects to the bulk upload problem page when manageExceptions fails', async () => {
    jest.resetModules();

    const manageExceptions = jest.fn().mockRejectedValue(new Error('Service unavailable'));

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
    const res = { redirect } as unknown as Response;
    const req = {
      file: {
        buffer: Buffer.from(
          'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,Incident,CANCELLED'
        ),
      },
      session: {},
    } as unknown as Request;

    await handler(req, res);

    expect(manageExceptions).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(303, '/bulk-upload/problem');
    expect(req.session).not.toHaveProperty('bulkUploadResponseCsv');
  });
});
