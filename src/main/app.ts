import * as path from 'path';

import * as bodyParser from 'body-parser';
import config from 'config';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import express, { Express } from 'express';
import RateLimit from 'express-rate-limit';
import { glob } from 'glob';

import { HTTPError } from './HttpError';
import { AppInsights } from './modules/appinsights';
import { Helmet } from './modules/helmet';
import { Nunjucks } from './modules/nunjucks';
import { PropertiesVolume } from './modules/properties-volume';
import { AppSession } from './modules/session';

const { Logger } = require('@hmcts/nodejs-logging');

const { setupDev } = require('./development');

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';
const authEnabled: boolean = config.get('auth.enabled');
const useCSRFProtection: boolean = config.get('useCSRFProtection');
const urlencodedLimit: string = config.get('requestBody.urlencodedLimit');
const urlencodedParameterLimit: number = config.get('requestBody.urlencodedParameterLimit');

const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

export const app = express();
app.locals.ENV = env;
app.set('trust proxy', 1);

const logger = Logger.getLogger('app');
type RouteModule = { default?: (app: Express) => void };

new PropertiesVolume().enableFor(app);
new AppInsights().enable();
new Nunjucks(developmentMode).enableFor(app);
// secure the application by adding various HTTP headers to its responses
new Helmet(developmentMode).enableFor(app);

app.get('/favicon.ico', limiter, (req, res) => {
  res.sendFile(path.join(__dirname, '/public/assets/images/favicon.ico'));
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false, limit: urlencodedLimit, parameterLimit: urlencodedParameterLimit }));
app.use(cookieParser(config.get('secrets.hmc.hmc-admin-ui-session-secret')));
new AppSession().enableFor(app);
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate, no-store');
  next();
});

const routeFiles = glob.sync(path.join(__dirname, 'routes/**/*.+(ts|js)'));
routeFiles
  .filter(filename => ['health', 'info'].includes(path.basename(filename, path.extname(filename))))
  .map(filename => require(filename) as RouteModule)
  .forEach(route => route.default?.(app));

if (authEnabled) {
  const { OidcMiddleware } = require('./modules/oidc');
  new OidcMiddleware().enableFor(app);
}

if (useCSRFProtection) {
  app.use(csrf());
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
}

routeFiles
  .filter(filename => !['health', 'info'].includes(path.basename(filename, path.extname(filename))))
  .map(filename => require(filename) as RouteModule)
  .forEach(route => route.default?.(app));

setupDev(app, developmentMode);
// returning "not found" page for requests with paths not resolved by the router
app.use((req, res) => {
  res.status(404);
  res.render('not-found');
});

// error handler
app.use((err: HTTPError, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`${err.stack || err}`);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = env === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
