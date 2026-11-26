import * as os from 'node:os';

import { infoRequestHandler } from '@hmcts/info-provider';
import { Router } from 'express';

export default function registerInfoRoute(app: Router): void {
  app.get(
    '/info',
    infoRequestHandler({
      extraBuildInfo: {
        host: os.hostname(),
        name: 'expressjs-template',
        uptime: process.uptime(),
      },
      info: {},
    })
  );
}
