import { AxiosInstance, create } from 'axios';
import config from 'config';

import { ServiceAuthTokenProvider } from '../modules/service-auth';

export type ManageEndpointsPayload = Record<string, unknown>;
export type ManageEndpointsResponse = unknown;

export class HearingService {
  private readonly client: AxiosInstance;
  private readonly manageEndpointsPath: string = '/manageEndpoints';
  private readonly serviceAuthTokenProvider: ServiceAuthTokenProvider;

  public constructor(client?: AxiosInstance, serviceAuthTokenProvider = new ServiceAuthTokenProvider()) {
    this.client =
      client ??
      create({
        baseURL: config.get('services.hmc.url'),
      });
    this.serviceAuthTokenProvider = serviceAuthTokenProvider;
  }

  public async manageEndpoints(
    payload: ManageEndpointsPayload,
    userAccessToken: string
  ): Promise<ManageEndpointsResponse> {
    const serviceAuthToken = await this.serviceAuthTokenProvider.getToken();
    const response = await this.client.post<ManageEndpointsResponse>(this.manageEndpointsPath, payload, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        ServiceAuthorization: `Bearer ${serviceAuthToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }
}
