const addTo = jest.fn();
const up = jest.fn(() => 'up');
const down = jest.fn(() => 'down');
const raw = jest.fn(callback => callback);

jest.mock('@hmcts/nodejs-healthcheck', () => ({
  addTo,
  down,
  raw,
  up,
}));

jest.mock('../../../main/app', () => ({
  app: {
    locals: {
      shutdown: false,
    },
  },
}));

import { app as myApp } from '../../../main/app';
import healthRoute from '../../../main/routes/health';

describe('health route', () => {
  test('registers health checks', () => {
    const app = {} as never;

    healthRoute(app);

    expect(addTo).toHaveBeenCalledWith(
      app,
      expect.objectContaining({
        checks: expect.objectContaining({
          sampleCheck: expect.any(Function),
        }),
        readinessChecks: expect.objectContaining({
          shutdownCheck: expect.any(Function),
        }),
      })
    );
  });

  test('reports shutdown readiness as down', () => {
    healthRoute({} as never);

    const config = addTo.mock.calls[addTo.mock.calls.length - 1][1];

    expect(config.readinessChecks.shutdownCheck()).toBe('up');

    myApp.locals.shutdown = true;

    expect(config.readinessChecks.shutdownCheck()).toBe('down');
  });
});
