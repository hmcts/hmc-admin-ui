import { AxiosInstance } from 'axios';

jest.mock('otplib', () => ({
  NobleCryptoPlugin: jest.fn(() => ({ name: 'crypto-plugin' })),
  ScureBase32Plugin: jest.fn(() => ({ name: 'base32-plugin' })),
  createGuardrails: jest.fn(() => ({ MIN_SECRET_BYTES: 10 })),
  generateSync: jest.fn(() => '023871'),
}));

import { ServiceAuthTokenProvider } from '../../../main/modules/service-auth';

jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      'services.s2s': 'http://service-auth-provider',
      microservice: 'hmc-admin-ui',
      'secrets.hmc.hmc-admin-ui-s2s-secret': 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
    };

    return values[key];
  }),
}));

describe('ServiceAuthTokenProvider', () => {
  test('leases an S2S token for the configured microservice using a one time password', async () => {
    const post = jest.fn().mockResolvedValue({ data: 'service-token' });
    const client = { post } as unknown as AxiosInstance;
    jest.useFakeTimers().setSystemTime(new Date('2026-07-29T12:00:00Z'));

    try {
      await expect(new ServiceAuthTokenProvider(client).getToken()).resolves.toBe('service-token');

      expect(post).toHaveBeenCalledWith(
        '/lease',
        {
          microservice: 'hmc-admin-ui',
          oneTimePassword: '023871',
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
