import { constants as http } from 'node:http2';

import config from 'config';
import { Application, NextFunction, Request, Response } from 'express';
import { Session, auth } from 'express-openid-connect';

import { HTTPError } from '../../HttpError';

type IdamUser = {
  uid?: string;
  sub?: string;
  email?: string;
  roles?: string[] | string;
};

export class OidcMiddleware {
  private readonly clientId: string = config.get('services.idam.clientID');
  private readonly clientSecret: string = config.get('secrets.hmc.hmc-admin-ui-client-secret');
  private readonly clientScope: string = config.get('services.idam.scope');
  private readonly baseUrl: string = config.get('services.idam.url.hmc');
  private readonly idamBaseUrl: string = config.get('services.idam.url.public');
  private readonly sessionSecret: string = config.get('secrets.hmc.hmc-admin-ui-session-secret');
  private readonly accessRole: string = config.get('RBAC.access');
  private readonly sessionCookieName: string = config.get('session.cookie.name');

  public enableFor(app: Application): void {
    app.use(
      auth({
        issuerBaseURL: this.idamBaseUrl + '/o',
        baseURL: this.baseUrl,
        httpTimeout: 15099,
        clientID: this.clientId,
        secret: this.sessionSecret,
        clientSecret: this.clientSecret,
        clientAuthMethod: 'client_secret_post',
        idpLogout: true,
        authorizationParams: {
          response_type: 'code',
          scope: this.clientScope,
        },
        routes: {
          callback: '/oauth2/callback',
          logout: '/logout',
          postLogoutRedirect: this.baseUrl,
        },
        session: {
          name: this.sessionCookieName,
          rollingDuration: 60 * 60,
          cookie: {
            httpOnly: true,
          },
          rolling: true,
        },
        afterCallback: (_req: Request, res: Response, oidcSession: Session) => {
          if (res.statusCode !== http.HTTP_STATUS_OK || !oidcSession.id_token) {
            throw new HTTPError('Forbidden', http.HTTP_STATUS_FORBIDDEN);
          }

          const tokenUser = this.decodeIdToken(oidcSession.id_token);
          const roles = this.normaliseRoles(tokenUser.roles);
          this.assertAccess(roles);

          return {
            ...oidcSession,
            user: {
              id: tokenUser.uid ?? tokenUser.sub,
              email: tokenUser.email,
              roles,
            },
          };
        },
      })
    );

    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (!req.oidc?.isAuthenticated?.()) {
        throw new HTTPError('Forbidden', http.HTTP_STATUS_FORBIDDEN);
      }

      this.assertAccess(this.normaliseRoles(req.oidc.user?.roles));
      _res.locals.isAuthenticated = true;
      next();
    });
  }

  private assertAccess(roles: string[]): void {
    if (this.accessRole && !roles.includes(this.accessRole)) {
      throw new HTTPError('Forbidden', http.HTTP_STATUS_FORBIDDEN);
    }
  }

  private normaliseRoles(roles: unknown): string[] {
    if (Array.isArray(roles)) {
      return roles.filter((role): role is string => typeof role === 'string');
    }

    if (typeof roles === 'string') {
      return [roles];
    }

    return [];
  }

  private decodeIdToken(idToken: string): IdamUser {
    const [, payload] = idToken.split('.');
    if (!payload) {
      throw new HTTPError('Forbidden', http.HTTP_STATUS_FORBIDDEN);
    }

    const normalisedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(normalisedPayload, 'base64').toString('utf8')) as IdamUser;
  }
}
