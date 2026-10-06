import config from 'config';
import { Application } from 'express';
import session from 'express-session';

export class AppSession {
  private readonly sessionSecret: string = config.get('secrets.hmc.hmc-admin-ui-session-secret');
  private readonly cookieName: string = config.get('session.appCookie.name');

  public enableFor(app: Application): void {
    app.use(
      session({
        name: this.cookieName,
        secret: this.sessionSecret,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
        },
      })
    );
  }
}
