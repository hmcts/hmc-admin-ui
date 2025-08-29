import config from 'config';

export class AppInsights {
  enable(): void {
    // 1) Never start telemetry in tests
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // 2) Prefer a connection string, fall back to instrumentation key
    const envConn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    const cfgConn = config.has('appInsights.connectionString')
      ? String(config.get('appInsights.connectionString'))
      : undefined;
    const cfgKey = config.has('appInsights.instrumentationKey')
      ? String(config.get('appInsights.instrumentationKey'))
      : undefined;

    const connectionString = envConn || cfgConn || (cfgKey ? `InstrumentationKey=${cfgKey}` : undefined);

    // Nothing configured – do nothing
    if (!connectionString) {
      return;
    }

    // 3) Lazy-require to avoid import-time side effects (fixes Jest noise)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appInsights = require('applicationinsights');

    appInsights
      .setup(connectionString)
      .setSendLiveMetrics(true) // keep your previous behaviour
      .start();

    // Keep your cloudRole tag
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'hmc-admin-ui';

    // Keep your initial trace
    appInsights.defaultClient.trackTrace({
      message: 'App insights activated',
    });
  }
}
