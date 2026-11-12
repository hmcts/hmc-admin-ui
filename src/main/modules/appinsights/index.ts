import config from 'config';

export class AppInsights {
  enable(): void {
    if (config.get('appInsights.instrumentationKey')) {
      const appInsights = require('applicationinsights');

      appInsights.setup(config.get('appInsights.instrumentationKey')).setSendLiveMetrics(true).start();

      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'hmc-admin-ui';
      appInsights.defaultClient.trackTrace({
        message: 'App insights activated',
      });
    }
  }
}
