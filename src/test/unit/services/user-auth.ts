import { Request } from 'express';

import { HTTPError } from '../../../main/HttpError';
import { getUserAccessToken } from '../../../main/services/user-auth';

describe('getUserAccessToken', () => {
  test('returns the OIDC access token from the request', () => {
    const req = {
      oidc: {
        accessToken: {
          access_token: 'user-token',
        },
      },
    } as unknown as Request;

    expect(getUserAccessToken(req)).toBe('user-token');
  });

  test('rejects requests without a user access token', () => {
    expect(() => getUserAccessToken({ oidc: {} } as Request)).toThrow(new HTTPError('Forbidden', 403));
  });
});
