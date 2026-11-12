import config from 'config';

export class AppInsights {
  enable(): void {
    let connectionString = config.get<string>('appInsights.connectionString');
    if (!connectionString) {
      const instrumentationKey = config.get<string | false>('appInsights.instrumentationKey');
      if (!instrumentationKey) {
        return;
      }

      connectionString = instrumentationKey.includes('=')
        ? instrumentationKey
        : `InstrumentationKey=${instrumentationKey}`;
    }

    const appInsights = require('applicationinsights');
    const setup = appInsights.setup(connectionString).setSendLiveMetrics(true);

    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'hmc-admin-ui';
    setup.start();
    appInsights.defaultClient.trackTrace({
      message: 'App insights activated',
    });
  }
}
