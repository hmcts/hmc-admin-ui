import { HTTPError } from '../../main/HttpError';

describe('HTTPError', () => {
  test('sets the error message and status', () => {
    const error = new HTTPError('Forbidden', 403);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Forbidden');
    expect(error.status).toBe(403);
  });
});
