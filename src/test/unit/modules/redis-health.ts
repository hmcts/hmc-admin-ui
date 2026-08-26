const logger = {
  error: jest.fn(),
};
const connect = jest.fn();
const ping = jest.fn();
const quit = jest.fn();
const on = jest.fn();
const createClient = jest.fn(() => ({
  connect,
  isOpen: true,
  on,
  ping,
  quit,
}));

function mockConfig(values: Record<string, boolean | string>): void {
  jest.doMock('config', () => ({
    get: jest.fn((key: string) => values[key]),
  }));
}

describe('RedisHealth', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    connect.mockResolvedValue(undefined);
    ping.mockResolvedValue('PONG');
    quit.mockResolvedValue(undefined);

    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: jest.fn(() => logger),
      },
    }));
    jest.doMock(
      'redis',
      () => ({
        createClient,
      }),
      { virtual: true }
    );
  });

  test('passes when Redis is disabled', async () => {
    mockConfig({
      'redis.enabled': false,
      'redis.connectionString': '',
    });

    const { RedisHealth } = require('../../../main/modules/redis-health');

    await expect(new RedisHealth().check()).resolves.toBe(true);
    expect(createClient).not.toHaveBeenCalled();
  });

  test('pings Redis when Redis is enabled', async () => {
    mockConfig({
      'redis.enabled': true,
      'redis.connectionString': 'rediss://ignore:redis-password@redis.internal:6380',
    });

    const { RedisHealth } = require('../../../main/modules/redis-health');

    await expect(new RedisHealth().check()).resolves.toBe(true);
    expect(createClient).toHaveBeenCalledWith({
      socket: {
        connectTimeout: 1000,
        reconnectStrategy: false,
      },
      url: 'rediss://ignore:redis-password@redis.internal:6380',
    });
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(connect).toHaveBeenCalled();
    expect(ping).toHaveBeenCalled();
    expect(quit).toHaveBeenCalled();
  });

  test('fails when Redis is enabled without a connection string', async () => {
    mockConfig({
      'redis.enabled': true,
      'redis.connectionString': '',
    });

    const { RedisHealth } = require('../../../main/modules/redis-health');

    await expect(new RedisHealth().check()).resolves.toBe(false);
    expect(createClient).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Redis health check failed: redis.connectionString is not configured');
  });

  test('fails when Redis ping fails', async () => {
    mockConfig({
      'redis.enabled': true,
      'redis.connectionString': 'rediss://ignore:redis-password@redis.internal:6380',
    });
    ping.mockResolvedValue('NOPE');

    const { RedisHealth } = require('../../../main/modules/redis-health');

    await expect(new RedisHealth().check()).resolves.toBe(false);
    expect(quit).toHaveBeenCalled();
  });

  test('fails when Redis connection fails', async () => {
    mockConfig({
      'redis.enabled': true,
      'redis.connectionString': 'rediss://ignore:redis-password@redis.internal:6380',
    });
    connect.mockRejectedValue(new Error('connection refused'));

    const { RedisHealth } = require('../../../main/modules/redis-health');

    await expect(new RedisHealth().check()).resolves.toBe(false);
    expect(logger.error).toHaveBeenCalledWith('Redis health check failed: connection refused');
    expect(quit).toHaveBeenCalled();
  });
});
