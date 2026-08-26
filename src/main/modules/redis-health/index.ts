import config from 'config';

const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('redis-health');

export class RedisHealth {
  private readonly redisEnabled: boolean = config.get('redis.enabled');
  private readonly redisConnectionString: string = config.get('redis.connectionString');

  public async check(): Promise<boolean> {
    if (!this.redisEnabled) {
      return true;
    }

    if (!this.redisConnectionString) {
      logger.error('Redis health check failed: redis.connectionString is not configured');
      return false;
    }

    const { createClient } = require('redis');
    const redisClient = createClient({
      url: this.redisConnectionString,
      socket: {
        connectTimeout: 1000,
        reconnectStrategy: false,
      },
    });

    redisClient.on('error', (error: Error) => {
      logger.error(`Redis health check client error: ${error.message}`);
    });

    try {
      await redisClient.connect();
      return (await redisClient.ping()) === 'PONG';
    } catch (error) {
      logger.error(`Redis health check failed: ${(error as Error).message}`);
      return false;
    } finally {
      if (redisClient.isOpen) {
        await redisClient.quit();
      }
    }
  }
}
