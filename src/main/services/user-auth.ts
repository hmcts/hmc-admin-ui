import { Request } from 'express';

import { HTTPError } from '../HttpError';

export function getUserAccessToken(req: Request): string {
  const accessToken = req.oidc?.accessToken?.access_token;

  if (!accessToken) {
    throw new HTTPError('Forbidden', 403);
  }

  return accessToken;
}
