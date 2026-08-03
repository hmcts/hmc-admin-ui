import { AxiosInstance } from 'axios';

jest.mock('otplib', () => ({
  NobleCryptoPlugin: jest.fn(() => ({ name: 'crypto-plugin' })),
  ScureBase32Plugin: jest.fn(() => ({ name: 'base32-plugin' })),
  createGuardrails: jest.fn(() => ({ MIN_SECRET_BYTES: 10 })),
  generateSync: jest.fn(() => '023871'),
}));

import { ServiceAuthTokenProvider } from '../../../main/modules/service-auth';
import { HearingService } from '../../../main/services/hearing-service';

jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      'services.hearingService.manageEndpointsPath': '/manageEndpoints',
      'services.hearingService.url': 'http://hearing-service',
    };

    return values[key];
  }),
}));

describe('HearingService', () => {
  test('posts JSON to manageEndpoints with user and service auth headers', async () => {
    const payload = { hearingIds: ['123'] };
    const post = jest.fn().mockResolvedValue({ data: { status: 'accepted' } });
    const client = { post } as unknown as AxiosInstance;
    const serviceAuthTokenProvider = {
      getToken: jest.fn().mockResolvedValue('service-token'),
    } as unknown as ServiceAuthTokenProvider;

    await expect(
      new HearingService(client, serviceAuthTokenProvider).manageEndpoints(payload, 'user-token')
    ).resolves.toEqual({
      status: 'accepted',
    });

    expect(post).toHaveBeenCalledWith('/manageEndpoints', payload, {
      headers: {
        Authorization: 'Bearer user-token',
        ServiceAuthorization: 'Bearer service-token',
        'Content-Type': 'application/json',
      },
    });
  });
});
