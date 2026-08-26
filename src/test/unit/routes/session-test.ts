import { Application, Request, Response } from 'express';

type RouteHandler = (req: Request, res: Response) => void | Promise<void>;
type RegisteredRoute = [string, ...unknown[]];

function mockConfig(sessionTestEnabled: boolean, baseUrl = 'https://hmc-admin-ui.demo.platform.hmcts.net'): void {
  jest.doMock('config', () => ({
    get: jest.fn((key: string) => {
      if (key === 'session.test.enabled') {
        return sessionTestEnabled;
      }

      if (key === 'services.idam.url.hmc') {
        return baseUrl;
      }

      return undefined;
    }),
  }));
}

describe('Session test route', () => {
  let get: jest.Mock<void, RegisteredRoute>;
  let app: Application;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    get = jest.fn<void, RegisteredRoute>();
    app = { get } as unknown as Application;
  });

  test('returns not found when disabled', () => {
    mockConfig(false);
    const sessionTestRoute = require('../../../main/routes/session-test').default;

    sessionTestRoute(app);

    const handler = get.mock.calls[0][1] as RouteHandler;
    const status = jest.fn(() => ({ render }));
    const render = jest.fn();
    const res = { status } as unknown as Response;

    handler({ session: {} } as Request, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(render).toHaveBeenCalledWith('not-found');
  });

  test('sets a session test value when enabled', () => {
    mockConfig(true);
    const sessionTestRoute = require('../../../main/routes/session-test').default;

    sessionTestRoute(app);

    const handler = get.mock.calls[1][1] as RouteHandler;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const req = { session: {} } as Request;
    const res = { status } as unknown as Response;

    handler(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      sessionTestValue: expect.any(String),
    });
    expect((req.session as unknown as { sessionTestValue: string }).sessionTestValue).toEqual(expect.any(String));
  });

  test('returns not found when enabled outside demo', () => {
    mockConfig(true, 'https://hmc-admin-ui.aat.platform.hmcts.net');
    const sessionTestRoute = require('../../../main/routes/session-test').default;

    sessionTestRoute(app);

    const handler = get.mock.calls[0][1] as RouteHandler;
    const status = jest.fn(() => ({ render }));
    const render = jest.fn();
    const res = { status } as unknown as Response;

    handler({ session: {} } as Request, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(render).toHaveBeenCalledWith('not-found');
  });

  test('reads a session test value when enabled', () => {
    mockConfig(true);
    const sessionTestRoute = require('../../../main/routes/session-test').default;

    sessionTestRoute(app);

    const handler = get.mock.calls[0][1] as RouteHandler;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status } as unknown as Response;

    handler({ session: { sessionTestValue: 'test-value' } } as unknown as Request, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      sessionTestValue: 'test-value',
    });
  });
});
