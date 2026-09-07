import { Express, RequestHandler } from 'express';
import helmet from 'helmet';

import { Helmet } from '../../../main/modules/helmet';

jest.mock('helmet', () => jest.fn(() => 'helmet-middleware'));

describe('Helmet module', () => {
  let app: Express;
  let use: jest.Mock<void, [RequestHandler]>;
  const mockedHelmet = helmet as unknown as jest.Mock;

  beforeEach(() => {
    mockedHelmet.mockClear();
    use = jest.fn<void, [RequestHandler]>();
    app = { use } as unknown as Express;
  });

  test('enables secure production headers', () => {
    new Helmet(false).enableFor(app);

    expect(mockedHelmet).toHaveBeenCalledWith({
      contentSecurityPolicy: {
        directives: {
          connectSrc: ["'self'"],
          defaultSrc: ["'none'"],
          fontSrc: ["'self'", 'data:'],
          imgSrc: ["'self'", '*.google-analytics.com'],
          manifestSrc: ["'self'"],
          objectSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            '*.google-analytics.com',
            "'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='",
            "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
          ],
          styleSrc: ["'self'"],
        },
      },
      referrerPolicy: { policy: 'origin' },
    });
    expect(use).toHaveBeenCalledWith('helmet-middleware');
  });

  test('allows webpack connections and eval in development mode', () => {
    new Helmet(true).enableFor(app);

    expect(mockedHelmet).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSecurityPolicy: {
          directives: expect.objectContaining({
            connectSrc: ["'self'", 'webpack:'],
            scriptSrc: expect.arrayContaining(["'unsafe-eval'"]),
          }),
        },
      })
    );
  });
});
