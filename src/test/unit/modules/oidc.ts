import { constants as http } from 'node:http2';

import { Application, NextFunction, Request, Response } from 'express';
import { auth } from 'express-openid-connect';

import { HTTPError } from '../../../main/HttpError';
import { OidcMiddleware } from '../../../main/modules/oidc';

jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      'services.idam.clientID': 'hmc_admin_ui',
      'secrets.hmc.hmc-admin-ui-client-secret': 'client-secret',
      'services.idam.scope': 'openid profile roles',
      'services.idam.url.hmc': 'https://hmc-admin-ui.preview.platform.hmcts.net',
      'services.idam.url.public': 'https://hmcts-access.aat.platform.hmcts.net',
      'secrets.hmc.hmc-admin-ui-session-secret': 'session-secret',
      'RBAC.access': 'hmc-admin-ui-access',
      'session.cookie.name': 'hmc-admin-ui-session',
    };

    return values[key];
  }),
}));

jest.mock('express-openid-connect', () => ({
  auth: jest.fn(() => 'oidc-auth-middleware'),
}));

type AuthOptions = {
  afterCallback: (req: Request, res: Response, session: { id_token?: string }) => unknown;
};

function createIdToken(payload: Record<string, unknown>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `header.${encodedPayload}.signature`;
}

describe('OidcMiddleware', () => {
  let use: jest.Mock;
  let app: Application;
  const mockedAuth = auth as jest.Mock;

  beforeEach(() => {
    mockedAuth.mockClear();
    use = jest.fn();
    app = { use } as unknown as Application;
  });

  test('configures express-openid-connect and registers auth middleware', () => {
    new OidcMiddleware().enableFor(app);

    expect(mockedAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        issuerBaseURL: 'https://hmcts-access.aat.platform.hmcts.net/o',
        baseURL: 'https://hmc-admin-ui.preview.platform.hmcts.net',
        clientID: 'hmc_admin_ui',
        clientSecret: 'client-secret',
        clientAuthMethod: 'client_secret_post',
        authorizationParams: {
          response_type: 'code',
          scope: 'openid profile roles',
        },
        routes: {
          callback: '/oauth2/callback',
          logout: '/logout',
          postLogoutRedirect: 'https://hmc-admin-ui.preview.platform.hmcts.net',
        },
        session: expect.objectContaining({
          name: 'hmc-admin-ui-session',
          rolling: true,
        }),
      })
    );
    expect(use).toHaveBeenCalledWith('oidc-auth-middleware');
  });

  test('adds user details from a valid IDAM token after callback', () => {
    new OidcMiddleware().enableFor(app);
    const options = mockedAuth.mock.calls[0][0] as AuthOptions;
    const idToken = createIdToken({
      uid: 'user-id',
      email: 'user@example.com',
      roles: ['hmc-admin-ui-access'],
    });

    const session = options.afterCallback({} as Request, { statusCode: http.HTTP_STATUS_OK } as Response, {
      id_token: idToken,
    });

    expect(session).toMatchObject({
      id_token: idToken,
      user: {
        id: 'user-id',
        email: 'user@example.com',
        roles: ['hmc-admin-ui-access'],
      },
    });
  });

  test('rejects callback sessions without the required role', () => {
    new OidcMiddleware().enableFor(app);
    const options = mockedAuth.mock.calls[0][0] as AuthOptions;
    const idToken = createIdToken({
      sub: 'subject-id',
      roles: ['different-role'],
    });

    expect(() =>
      options.afterCallback({} as Request, { statusCode: http.HTTP_STATUS_OK } as Response, { id_token: idToken })
    ).toThrow(new HTTPError('Forbidden', http.HTTP_STATUS_FORBIDDEN));
  });

  test('rejects unauthenticated requests in the route guard', () => {
    new OidcMiddleware().enableFor(app);
    const guard = use.mock.calls[1][0] as (req: Request, res: Response, next: NextFunction) => void;

    expect(() => guard({ oidc: { isAuthenticated: () => false } } as Request, {} as Response, jest.fn())).toThrow(
      new HTTPError('Forbidden', http.HTTP_STATUS_FORBIDDEN)
    );
  });

  test('marks authenticated requests as authenticated for views', () => {
    new OidcMiddleware().enableFor(app);
    const guard = use.mock.calls[1][0] as (req: Request, res: Response, next: NextFunction) => void;
    const next = jest.fn();
    const res = { locals: {} } as Response;

    guard(
      { oidc: { isAuthenticated: () => true, user: { roles: 'hmc-admin-ui-access' } } } as unknown as Request,
      res,
      next
    );

    expect(res.locals.isAuthenticated).toBe(true);
    expect(next).toHaveBeenCalled();
  });
});
