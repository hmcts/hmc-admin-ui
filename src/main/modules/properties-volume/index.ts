import * as propertiesVolume from '@hmcts/properties-volume';
import config from 'config';
import { Application } from 'express';
import { get, set } from 'lodash';

export class PropertiesVolume {
  enableFor(server: Application): void {
    if (server.locals.ENV !== 'development') {
      propertiesVolume.addTo(config);

      this.setSecret('secrets.hmc.AppInsightsInstrumentationKey', 'appInsights.instrumentationKey');
      this.setSecret('secrets.hmc.hmc-admin-ui-redis6-connection-string', 'redis.connectionString');
      this.setSecret('secrets.hmc.hmc-admin-ui-managed-redis-connection-string', 'redis.connectionString');
    }
  }

  private setSecret(fromPath: string, toPath: string): void {
    const value = config.has(fromPath) ? get(config, fromPath) : undefined;

    if (value) {
      set(config, toPath, value);
    }
  }
}
