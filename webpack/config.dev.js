const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { getDistDir, createHtmlPlugins } = require("./util");

const distDir = getDistDir();
const siteVariables = require("./site.dev.json");

const entrypoints = { index: "./src/index.ts" };

// for testing bfcache (WebSockets client-side turns off bfcache)
if (!process.env.NO_RELOAD) {
  entrypoints.reload = "./webpack/watch-reload-client.js";
}

module.exports = {
  mode: "development",
  devtool: "eval-source-map",
  entry: entrypoints,
  output: { path: distDir, filename: "[name].bundle.js", clean: true },
  resolve: { extensions: [".ts", ".js", ".json"] },
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
