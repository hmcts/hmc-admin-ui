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
      'services.hearingService.manageExceptionsPath': '/manageExceptions',
      'services.hearingService.url': 'http://hearing-service',
    };

    return values[key];
  }),
}));

describe('HearingService', () => {
  test('posts JSON to manageExceptions with user and service auth headers', async () => {
    const payload = {
      supportRequests: [
        {
          hearingId: '123',
          caseRef: '1234567890123456',
          action: 'rollback',
          notes: '',
          state: '',
        },
      ],
    };
    const post = jest.fn().mockResolvedValue({ data: { status: 'accepted' } });
    const client = { post } as unknown as AxiosInstance;
    const serviceAuthTokenProvider = {
      getToken: jest.fn().mockResolvedValue('service-token'),
    } as unknown as ServiceAuthTokenProvider;

    await expect(
      new HearingService(client, serviceAuthTokenProvider).manageExceptions(payload, 'user-token')
    ).resolves.toEqual({
      status: 'accepted',
    });

    expect(post).toHaveBeenCalledWith('/manageExceptions', payload, {
      headers: {
        Authorization: 'Bearer user-token',
        ServiceAuthorization: 'Bearer service-token',
        'Content-Type': 'application/json',
      },
    });
  });
});
