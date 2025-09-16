const path = require("path")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")
const CopyPlugin = require("copy-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const MiniSearchIndexPlugin = require("./minisearch-index-plugin")
const WebpackShellPlugin = require("webpack-shell-plugin-next")
const { getDistDir, createHtmlPlugins, createDefinePlugin } = require("./util")
const { getDevSiteVariables } = require("./site-variables")

const distDir = getDistDir()
const siteVariables = getDevSiteVariables()

const entrypoints = { index: "./src/index.ts" }

// for testing bfcache (WebSockets client-side turns off bfcache)
if (!process.env.NO_RELOAD) {
  entrypoints.reload = "./webpack/watch-reload-client.js"
}

module.exports = async () => {
  return {
    mode: "development",
    devtool: "eval-source-map",
    entry: entrypoints,
    output: {
      path: distDir,
      publicPath: siteVariables.basePath,
      filename: "[name].bundle.js",
      clean: true,
    },
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
      ...(await createHtmlPlugins(siteVariables)),
      createDefinePlugin(siteVariables, true),
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [path.join(distDir, "./**/*")],
      }),
      new MiniCssExtractPlugin({
        filename: "[name].css",
        chunkFilename: "[id].css",
      }),
      new CopyPlugin({ patterns: [{ from: "public", to: "." }] }),
      new MiniSearchIndexPlugin(siteVariables),
      new WebpackShellPlugin({
        onBuildEnd: {
          scripts: ["npx quick-lint-js src/**/*.ts webpack/*.js || true"],
        },
      }),
      require("./print-flair-plugin"),
    ],
    stats: "errors-only",
  }
}
