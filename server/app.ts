import * as path from 'path';

// import * as bodyParser from 'body-parser';
import { json, urlencoded } from 'body-parser';
// import config = require('config');
import config from 'config';
import cookieParser from 'cookie-parser';
import express from 'express';
import RateLimit from 'express-rate-limit';
import { glob } from 'glob';

import { HTTPError } from './HttpError';
import { AppInsights } from './modules/appinsights';
import { Helmet } from './modules/helmet';
import { PropertiesVolume } from './modules/properties-volume';

const { Logger } = require('@hmcts/nodejs-logging');
const expressNunjucks = require('express-nunjucks');

const { setupDev } = require('./development');

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

export const app = express();

// Configure Nunjucks templating for server-rendered views
const viewPaths = [path.join(__dirname, 'views'), path.join(__dirname, '../client/views')];
app.set('view engine', 'njk');
app.set('views', viewPaths);
expressNunjucks(app, {
  watch: developmentMode,
  noCache: developmentMode,
});

// In development, wire up webpack-dev-middleware before any static/catch‑all
if (developmentMode) {
  setupDev(app, developmentMode);
}

// In non‑dev, serve the built Angular app from dist
const angularDistPath = path.join(__dirname, '../dist/hmc-admin-angular-ui/browser');
if (!developmentMode) {
  app.use(express.static(angularDistPath));
}

const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

// export const app = express();
// // Serve static files from the Angular app build directory
// const angularDistPath = path.join(__dirname, '../dist/hmc-admin-angular-ui/browser');
// app.use(express.static(angularDistPath));
//
// // All other routes should return the Angular app
// app.get('*', (req, res) => {
//   res.sendFile(path.join(angularDistPath, 'index.html'));
// });
app.locals.ENV = env;

const logger = Logger.getLogger('app');
new PropertiesVolume().enableFor(app);
new AppInsights().enable();
console.log(`Application started in ${env} mode`);
console.log('congiguration:', JSON.stringify(config));
// Generate a per-request nonce for CSP
app.use((req, res, next) => {
  const n = require('crypto').randomBytes(16).toString('base64');
  res.locals.nonce = n; // used by Helmet CSP function
  res.locals.cspNonce = n; // used by your Nunjucks templates
  next();
});
// secure the application by adding various HTTP headers to its responses
new Helmet(config.get('security')).enableFor(app);

app.get('/favicon.ico', limiter, (req, res) => {
  res.sendFile(path.join(__dirname, '/public/assets/images/favicon.ico'));
});

app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate, no-store');
  next();
});
// app.get('/', (_req, res) => res.sendFile(path.join(angularDistPath, 'index.html')));
// app.get('*', (_req, res) => res.sendFile(path.join(angularDistPath, 'index.html')));
if (!developmentMode) {
  app.get('/', (_req, res) => res.sendFile(path.join(angularDistPath, 'index.html')));
  app.get('*', (_req, res) => res.sendFile(path.join(angularDistPath, 'index.html')));
}

glob
  .sync(__dirname + '/routes/**/*.+(ts|js)')
  .map(filename => require(filename))
  .forEach(route => route.default(app));

// setupDev(app, developmentMode);
// returning "not found" page for requests with paths not resolved by the router
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// error handler
app.use((err: HTTPError, req: express.Request, res: express.Response) => {
  logger.error(`${err.stack || err}`);
  res.status(err.status || 500).json({
    message: 'Internal server error',
    error: env === 'development' ? err.message : {},
  });
});
