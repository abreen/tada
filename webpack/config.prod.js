const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { getDistDir, createHtmlPlugins } = require("./util");
const { getProdSiteVariables } = require("./site-variables");

const distDir = getDistDir();
const siteVariables = getProdSiteVariables();

module.exports = {
  mode: "production",
  entry: { index: "./src/index.ts" },
  output: { path: distDir, filename: "bundle.js" },
  resolve: { extensions: [".ts", ".js", ".json"] },
  devtool: false,
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: { loader: "babel-loader" },
      },
      { test: /\.tsx?$/, exclude: /node_modules/, loader: "ts-loader" },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({ terserOptions: { output: { comments: false } } }),
    ],
  },
  plugins: [
    ...createHtmlPlugins(siteVariables),
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [path.join(distDir, "./**/*")],
    }),
    new webpack.DefinePlugin({}),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
    new CopyPlugin({ patterns: [{ from: "public", to: "." }] }),
  ],
  stats: "minimal",
};
