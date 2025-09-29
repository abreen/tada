const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const MiniSearchIndexPlugin = require('./minisearch-index-plugin')
const GenerateFaviconPlugin = require('./generate-favicon-plugin')
const WebpackShellPlugin = require('webpack-shell-plugin-next')
const TerserPlugin = require('terser-webpack-plugin')
const { getDistDir, createHtmlPlugins, createDefinePlugin } = require('./util')
const { getProdSiteVariables } = require('./site-variables')

const distDir = getDistDir()
const siteVariables = getProdSiteVariables()

module.exports = async () => {
  return {
    mode: 'production',
    entry: { index: './src/index.ts' },
    output: {
      path: distDir,
      publicPath: siteVariables.basePath,
      filename: 'bundle.js',
    },
    resolve: { extensions: ['.ts', '.js', '.json'] },
    devtool: false,
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: { loader: 'babel-loader' },
        },
        { test: /\.tsx?$/, exclude: /node_modules/, loader: 'ts-loader' },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        },
      ],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({ terserOptions: { output: { comments: false } } }),
      ],
    },
    plugins: [
      ...(await createHtmlPlugins(siteVariables)),
      createDefinePlugin(siteVariables),
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [path.join(distDir, './**/*')],
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].css',
      }),
      new CopyPlugin({ patterns: [{ from: 'public', to: '.' }] }),
      new MiniSearchIndexPlugin(siteVariables),
      new GenerateFaviconPlugin(siteVariables),
      new WebpackShellPlugin({
        onBuildEnd: {
          scripts: ['npx quick-lint-js src/**/*.ts webpack/*.js || true'],
        },
      }),
      require('./print-flair-plugin'),
    ],
    stats: 'errors-only',
  }
}
