import { AxiosInstance, create } from 'axios';
import config from 'config';

import { ServiceAuthTokenProvider } from '../modules/service-auth';
import type { ManageExceptionsPayload, ManageExceptionsResponse } from '../types/manage-exceptions';

export class HearingService {
  private readonly client: AxiosInstance;
  private readonly manageExceptionsPath: string = '/manageExceptions';
  private readonly serviceAuthTokenProvider: ServiceAuthTokenProvider;

  public constructor(client?: AxiosInstance, serviceAuthTokenProvider = new ServiceAuthTokenProvider()) {
    this.client =
      client ??
      create({
        baseURL: config.get('services.hmc.url'),
      });
    this.serviceAuthTokenProvider = serviceAuthTokenProvider;
  }

  public async manageExceptions(
    payload: ManageExceptionsPayload,
    userAccessToken: string
  ): Promise<ManageExceptionsResponse> {
    const serviceAuthToken = await this.serviceAuthTokenProvider.getToken();

    const response = await this.client.post<ManageExceptionsResponse>(this.manageExceptionsPath, payload, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        ServiceAuthorization: `Bearer ${serviceAuthToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }
}
