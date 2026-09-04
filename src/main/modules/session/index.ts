import config from 'config';
import { Application } from 'express';
import session from 'express-session';

const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('session');

export class AppSession {
  private readonly sessionSecret: string = config.get('secrets.hmc.hmc-admin-ui-session-secret');
  private readonly cookieName: string = config.get('session.appCookie.name');
  private readonly redisEnabled: boolean = config.get('redis.enabled');
  private readonly redisConnectionString: string = config.get('redis.connectionString');
  private readonly redisKeyPrefix: string = config.get('redis.keyPrefix');

  public enableFor(app: Application): void {
    const store = this.redisEnabled ? this.createRedisSessionStore() : undefined;

    app.use(
      session({
        name: this.cookieName,
        store,
        secret: this.sessionSecret,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
        },
      })
    );
  }

  private createRedisSessionStore(): session.Store {
    if (!this.redisConnectionString) {
      throw new Error('Redis is enabled but redis.connectionString is not configured');
    }

    const { RedisStore } = require('connect-redis');
    const { createClient } = require('redis');
    const reconnectStrategy = (retries: number): number => Math.min(retries * 50, 2000);

    const redisClient = createClient({
      url: this.redisConnectionString,
      socket: { reconnectStrategy },
    });

    redisClient.on('error', (error: Error) => {
      logger.error(`Redis session client error: ${error.message}`);
    });

    redisClient.connect().catch((error: Error) => {
      logger.error(`Redis session client connection failed: ${error.message}`);
    });

    logger.info('Using Redis session store');

    return new RedisStore({
      client: redisClient,
      prefix: this.redisKeyPrefix,
    });
  }
}
