const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const devMode = process.env.NODE_ENV !== 'production';
const fileNameSuffix = devMode ? '-dev' : '.[contenthash]';
const filename = `[name]${fileNameSuffix}.css`;

const miniCss = new MiniCssExtractPlugin({
  // Options similar to the same options in webpackOptions.output
  // both options are optional
  filename,
  chunkFilename: '[id].css',
});

module.exports = {
  rules: [
    {
      test: /\.scss$/,
      use: [
        // 'style-loader',
        // {
        //   loader: MiniCssExtractPlugin.loader,
        //   options: {
        //     esModule: false,
        //   },
        // },
        // Use style-loader in dev; extract only in prod
        //    devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
        MiniCssExtractPlugin.loader,
        {
          loader: 'css-loader',
          options: {
            url: false,
            sourceMap: devMode,
          },
        },
        {
          loader: 'sass-loader',
          options: {
            sourceMap: devMode,
            implementation: require('sass'),
            sassOptions: {
              quietDeps: true,
              // If your Dart Sass >= 1.63:
              // silenceDeprecations: ['slash-div', 'mixed-decls']
            },
          },
        },
      ],
    },
  ],
  plugins: [miniCss],
  // plugins: devMode ? [] : [miniCss],
};
