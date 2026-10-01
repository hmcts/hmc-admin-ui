import config from 'config';

const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('redis-health');

const REDIS_HEALTH_CONNECT_TIMEOUT_MS = 1000;
const REDIS_HEALTH_MAX_ATTEMPTS = 3;
const REDIS_HEALTH_RETRY_DELAY_MS = 250;

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

    for (let attempt = 1; attempt <= REDIS_HEALTH_MAX_ATTEMPTS; attempt++) {
      if (await this.pingRedis(attempt)) {
        return true;
      }

      if (attempt < REDIS_HEALTH_MAX_ATTEMPTS) {
        await this.delay(REDIS_HEALTH_RETRY_DELAY_MS);
      }
    }

    return false;
  }

  private async pingRedis(attempt: number): Promise<boolean> {
    const { createClient } = require('redis');
    const redisClient = createClient({
      url: this.redisConnectionString,
      socket: {
        connectTimeout: REDIS_HEALTH_CONNECT_TIMEOUT_MS,
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
      logger.error(`Redis health check attempt ${attempt} failed: ${(error as Error).message}`);
      return false;
    } finally {
      if (redisClient.isOpen) {
        await redisClient.quit();
      }
    }
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, milliseconds));
  }
}
