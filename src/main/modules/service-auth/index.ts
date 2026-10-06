import { AxiosInstance, create } from 'axios';
import config from 'config';
import { createGuardrails } from 'otplib';

const { generateSync } = require('otplib');

const S2S_OTP_GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 10 });

type LeaseResponse = string;

export class ServiceAuthTokenProvider {
  private readonly client: AxiosInstance;
  private readonly microservice: string = config.get('microservice');
  private readonly secret: string = config.get('secrets.hmc.hmc-admin-ui-s2s-secret');

  public constructor(client?: AxiosInstance) {
    this.client =
      client ??
      create({
        baseURL: config.get('services.s2s'),
      });
  }

  public async getToken(): Promise<string> {
    const response = await this.client.post<LeaseResponse>(
      '/lease',
      {
        microservice: this.microservice,
        oneTimePassword: this.generateOneTimePassword(),
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return response.data;
  }

  private generateOneTimePassword(): string {
    return generateSync({ secret: this.secret, guardrails: S2S_OTP_GUARDRAILS });
  }
}
