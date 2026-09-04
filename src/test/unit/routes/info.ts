const infoRequestHandler = jest.fn(() => 'info-handler');

jest.mock('@hmcts/info-provider', () => ({
  infoRequestHandler,
}));

import infoRoute from '../../../main/routes/info';

describe('info route', () => {
  test('registers the info endpoint', () => {
    const get = jest.fn();
    const app = { get } as never;

    infoRoute(app);

    expect(get).toHaveBeenCalledWith('/info', 'info-handler');
    expect(infoRequestHandler).toHaveBeenCalledWith({
      extraBuildInfo: expect.objectContaining({
        host: expect.any(String),
        name: 'expressjs-template',
        uptime: expect.any(Number),
      }),
      info: {},
    });
  });
});
