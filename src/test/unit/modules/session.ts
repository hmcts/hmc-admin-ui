import { Application } from 'express';

type MockConfigValues = Record<string, boolean | number | string>;

const middleware = jest.fn();
const session = jest.fn(() => middleware);
const redisStore = jest.fn();
const connect = jest.fn().mockResolvedValue(undefined);
const on = jest.fn(() => ({ connect }));
const createClient = jest.fn(() => ({ connect, on }));

function mockConfig(values: MockConfigValues): void {
  jest.doMock('config', () => ({
    get: jest.fn((key: string) => values[key]),
  }));
}

function defaultConfig(redisEnabled: boolean): MockConfigValues {
  return {
    'secrets.hmc.hmc-admin-ui-session-secret': 'session-secret',
    'session.appCookie.name': 'hmc-admin-ui-app',
    'redis.enabled': redisEnabled,
    'redis.connectionString': '',
    'redis.keyPrefix': 'hmc-admin-sess:',
  };
}

describe('AppSession', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.doMock('express-session', () => ({
      __esModule: true,
      default: session,
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: jest.fn(() => ({
          error: jest.fn(),
          info: jest.fn(),
        })),
      },
    }));
  });

  test('uses the default session store when Redis is disabled', () => {
    mockConfig(defaultConfig(false));

    const { AppSession } = require('../../../main/modules/session');
    const use = jest.fn();
    const app = { use } as unknown as Application;

    new AppSession().enableFor(app);

    expect(session).toHaveBeenCalledWith({
      name: 'hmc-admin-ui-app',
      store: undefined,
      secret: 'session-secret',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
      },
    });
    expect(use).toHaveBeenCalledWith(middleware);
    expect(createClient).not.toHaveBeenCalled();
  });

  test('uses a Redis connection string when Redis is enabled and a connection string is configured', () => {
    mockConfig({
      ...defaultConfig(true),
      'redis.connectionString': 'rediss://:redis-password@redis.internal:6380',
    });
    jest.doMock(
      'redis',
      () => ({
        createClient,
      }),
      { virtual: true }
    );
    jest.doMock(
      'connect-redis',
      () => ({
        RedisStore: redisStore,
      }),
      { virtual: true }
    );

    const { AppSession } = require('../../../main/modules/session');
    const use = jest.fn();
    const app = { use } as unknown as Application;

    new AppSession().enableFor(app);

    expect(createClient).toHaveBeenCalledWith({
      socket: {
        reconnectStrategy: expect.any(Function),
      },
      url: 'rediss://:redis-password@redis.internal:6380',
    });
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(connect).toHaveBeenCalled();
    expect(redisStore).toHaveBeenCalledWith({
      client: { connect, on },
      prefix: 'hmc-admin-sess:',
    });
    expect(session).toHaveBeenCalledWith(expect.objectContaining({ store: redisStore.mock.instances[0] }));
    expect(use).toHaveBeenCalledWith(middleware);
  });

  test('throws when Redis is enabled without a connection string', () => {
    mockConfig(defaultConfig(true));

    const { AppSession } = require('../../../main/modules/session');
    const use = jest.fn();
    const app = { use } as unknown as Application;

    expect(() => new AppSession().enableFor(app)).toThrow(
      'Redis is enabled but redis.connectionString is not configured'
    );
    expect(createClient).not.toHaveBeenCalled();
    expect(use).not.toHaveBeenCalled();
  });
});
