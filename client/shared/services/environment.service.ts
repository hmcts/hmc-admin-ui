import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { shareReplay } from 'rxjs/operators';

import { DeploymentEnvironmentEnum } from '../../app/enums/deployment-environment-enum';
import { EnvironmentConfig } from '../../models/environmentConfig.model';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private data: EnvironmentConfig | undefined;

  public config$ = this.http
    .get<EnvironmentConfig>('/external/config/ui')
    .pipe<EnvironmentConfig>(shareReplay<EnvironmentConfig>(1));

  constructor(private readonly http: HttpClient, @Inject(Window) private readonly window: Window) {
    this.config$.subscribe(config => {
      this.data = config;
    });
  }

  public get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] | null {
    if (this.data) {
      return this.data[key];
    }
    return null;
  }

  public getDeploymentEnv(): DeploymentEnvironmentEnum {
    const hostname = this.window.location.hostname;
    console.log('Detecting environment for hostname ' + hostname);
    switch (hostname) {
      case 'hmc-admin-ui.platform.hmcts.net':
        return DeploymentEnvironmentEnum.PROD;
      case 'hmc-admin-ui.aat.platform.hmcts.net':
        return DeploymentEnvironmentEnum.AAT;
      case 'hmc-admin-ui.perftest.platform.hmcts.net':
        return DeploymentEnvironmentEnum.PERFTEST;
      case 'hmc-admin-ui.ithc.platform.hmcts.net':
        return DeploymentEnvironmentEnum.ITHC;
      case 'localhost':
        return DeploymentEnvironmentEnum.LOCAL;
      default: {
        if (hostname.includes('.demo.platform.hmcts.net')) {
          return DeploymentEnvironmentEnum.DEMO;
        } else if (hostname.includes('.preview.platform.hmcts.net')) {
          return DeploymentEnvironmentEnum.PREVIEW;
        }
        return DeploymentEnvironmentEnum.PROD;
      }
    }
  }
}
