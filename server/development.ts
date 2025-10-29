import * as path from 'path';

import * as express from 'express';

// const setupDev = (app: express.Express, developmentMode: boolean): void => {
//   if (developmentMode) {
//     const webpackDev = require('webpack-dev-middleware');
//     const webpack = require('webpack');
//     const webpackconfig = require('../client/webpack.config.js');
//     const compiler = webpack(webpackconfig);
//     app.use(
//       webpackDev(compiler, {
//         publicPath: '/',
//       })
//     );
//   }
// };
const setupDev = (app: express.Express, developmentMode: boolean): void => {
  if (developmentMode) {
    // Make sure loaders/config think we're in dev
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    const webpackDev = require('webpack-dev-middleware');
    const webpack = require('webpack');
    const rawConfig = require(path.resolve(__dirname, '../client/webpack.config.js'));
    const config =
      typeof rawConfig === 'function' ? rawConfig({}, { mode: 'development' }) : { ...rawConfig, mode: 'development' };
    if (!config.devtool) {
      config.devtool = 'source-map';
    }
    const publicPath = (config.output && config.output.publicPath) || '/';
    const compiler = webpack(config);
    app.use(
      webpackDev(compiler, {
        publicPath,
      })
    );
  }
};
module.exports = { setupDev };
