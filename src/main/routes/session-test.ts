import crypto from 'crypto';

import config from 'config';
import { Application, Request, Response } from 'express';

type SessionTestSession = {
  sessionTestValue?: string;
};

const demoBaseUrl = 'https://hmc-admin-ui.demo.platform.hmcts.net';
const sessionTestEnabled: boolean = config.get('session.test.enabled');
const configuredBaseUrl: string = config.get('services.idam.url.hmc');
const sessionTestAvailable = sessionTestEnabled && configuredBaseUrl === demoBaseUrl;

function notFound(res: Response): void {
  res.status(404).render('not-found');
}

export default function (app: Application): void {
  app.get('/session-test', (req: Request, res: Response) => {
    if (!sessionTestAvailable) {
      notFound(res);
      return;
    }

    const session = req.session as typeof req.session & SessionTestSession;

    res.status(200).json({
      sessionTestValue: session.sessionTestValue || null,
    });
  });

  app.get('/session-test/set', (req: Request, res: Response) => {
    if (!sessionTestAvailable) {
      notFound(res);
      return;
    }

    const session = req.session as typeof req.session & SessionTestSession;
    session.sessionTestValue = crypto.randomUUID();

    res.status(200).json({
      sessionTestValue: session.sessionTestValue,
    });
  });
}
