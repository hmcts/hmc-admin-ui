const path = require('path');

const sourcePath = path.resolve(__dirname, 'assets/js');
const govukFrontend = require(path.resolve(__dirname, '../webpack/govukFrontend'));
const scss = require(path.resolve(__dirname, '../webpack/scss'));
const HtmlWebpack = require(path.resolve(__dirname, '../webpack/htmlWebpack'));
const linkerPlugin = require('@angular/compiler-cli/linker/babel');
const { AngularWebpackPlugin } = require('@ngtools/webpack');

const devMode = process.env.NODE_ENV !== 'production';
const fileNameSuffix = devMode ? '-dev' : '.[contenthash]';
const filename = `[name]${fileNameSuffix}.js`;

module.exports = {
  plugins: [
    ...govukFrontend.plugins,
    ...scss.plugins,
    ...HtmlWebpack.plugins,
    new AngularWebpackPlugin({
      tsconfig: path.resolve(__dirname, 'tsconfig.json'), // your client tsconfig
      jitMode: false, // force AOT
      directTemplateLoading: true, // inline templateUrl/styleUrls
    }),
  ],
  entry: {
    main: [
      path.resolve(__dirname, 'polyfills.ts'),
      path.resolve(sourcePath, 'index.ts'), // govuk-frontend init
      path.resolve(__dirname, 'main.ts'), // Angular bootstrap
    ],
  },
  mode: devMode ? 'development' : 'production',
  devtool: devMode ? 'source-map' : false,
  // Silence Sass deprecation warnings originating from dependencies (e.g., govuk-frontend)
  ignoreWarnings: [
    // Generic Sass division deprecation from sass-loader
    { module: /sass-loader/, message: /Using \/ for division|slash-div/ },
    // Upcoming mixed declarations behavior change
    { module: /sass-loader/, message: /mixed-decls/ },
  ],
  module: {
    rules: [
      {
        oneOf: [
          // 1) Linker for partial-ivy node_modules
          {
            test: /\.[cm]?js$/,
            include: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: { compact: false, plugins: [linkerPlugin] },
            },
          },

          // 2) Angular component SCSS -> string (for ?ngResource)
          {
            test: /\.scss$/i,
            resourceQuery: /ngResource/,
            use: [
              { loader: 'raw-loader' },
              {
                loader: 'sass-loader',
                options: {
                  sourceMap: devMode,
                  implementation: require('sass'),
                  sassOptions: {
                    quietDeps: true, // hide deprecations from node_modules
                    // If your Dart Sass supports it (≥1.63):
                    silenceDeprecations: ['slash-div'], // or ['division'] depending on your Sass version
                  },
                },
              },
            ],
          },

          // 3) Angular component CSS -> string (for ?ngResource)
          {
            test: /\.css$/i,
            resourceQuery: /ngResource/,
            use: [{ loader: 'raw-loader' }],
          },

          // 4) Angular component HTML -> string (only if needed)
          {
            test: /\.html$/i,
            resourceQuery: /ngResource/,
            use: ['raw-loader'],
          },

          // 5) Your existing global SCSS/CSS pipeline (Extracts to files)
          ...scss.rules,

          // 6) Angular AOT for your app code
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{ loader: '@ngtools/webpack' }],
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.mjs'],
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    publicPath: '/',
    filename,
    devtoolModuleFilenameTemplate: info =>
      'webpack:///' + path.posix.relative(process.cwd(), info.absoluteResourcePath).replace(/\\\\/g, '/'),
  },
};
