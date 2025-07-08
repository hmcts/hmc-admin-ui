#!/usr/bin/env node
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';

import { app } from './app';

const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('server');

// let httpsServer: https.Server | null = null;

let server: http.Server | https.Server; // unified reference for either server type
// used by shutdownCheck in readinessChecks
app.locals.shutdown = false;

// TODO: set the right port for your application
const port: number = parseInt(process.env.PORT || '3000', 10);

if (app.locals.ENV === 'development') {
  const sslDirectory = path.join(__dirname, 'resources', 'localhost-ssl');
  const sslOptions = {
    cert: fs.readFileSync(path.join(sslDirectory, 'localhost.crt')),
    key: fs.readFileSync(path.join(sslDirectory, 'localhost.key')),
  };
  server = https.createServer(sslOptions, app);
  server.listen(port, () => {
    logger.info(`Application started: https://localhost:${port}`);
  });
} else {
  server = app.listen(port, () => {
    logger.info(`Application started: http://localhost:${port}`);
  });
}

function gracefulShutdownHandler(signal: string) {
  logger.info(`⚠️ Caught ${signal}, gracefully shutting down. Setting readiness to DOWN`);
  // stop the server from accepting new connections
  app.locals.shutdown = true;

  setTimeout(() => {
    logger.info('Shutting down application');

    server.close(err => {
      if (err) {
        logger.error('Error shutting down server', err);
        process.exit(1);
      } else {
        logger.info('Server closed gracefully');
        process.exit(0);
      }
    });
  }, 1000);

  setTimeout(() => {
    logger.error('Force exiting process due to shutdown timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', gracefulShutdownHandler);
process.on('SIGTERM', gracefulShutdownHandler);
