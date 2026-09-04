import { Application } from 'express';

import { app as myApp } from '../app';
import { RedisHealth } from '../modules/redis-health';

const healthcheck = require('@hmcts/nodejs-healthcheck');

function shutdownCheck(): boolean {
  return myApp.locals.shutdown;
}

export default function healthRoute(app: Application): void {
  const redisHealth = new RedisHealth();
  const healthCheckConfig = {
    checks: {
      redis: healthcheck.raw(async () => {
        return (await redisHealth.check()) ? healthcheck.up() : healthcheck.down();
      }),
    },
    readinessChecks: {
      shutdownCheck: healthcheck.raw(() => {
        return shutdownCheck() ? healthcheck.down() : healthcheck.up();
      }),
    },
  };

  healthcheck.addTo(app, healthCheckConfig);
}
