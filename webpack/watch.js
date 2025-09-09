#!/usr/bin/env node
const chokidar = require("chokidar");
const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");
const { R, B, L, P, I } = require("./colors");

const FLAIR_STRINGS = [
  "Tada",
  "Voilà",
  "Presto",
  "Boom",
  "Bam",
  "Ka-pow",
  "Shazam",
  "Eureka",
];

function getFlair() {
  const i = Math.floor(Math.random() * FLAIR_STRINGS.length);
  return I`${FLAIR_STRINGS[i]}` + "! 🎉";
}

function shortenWebpackOutput(output) {
  const numAssets = output.match(/(\d+) assets\n/)?.[1] || "?";
  const numModules = output.match(/(\d+) modules\n/)?.[1] || "?";

  const matches = output.match(
    /webpack ([\d.]+) compiled successfully in (\d+) ms\n/,
  );
  const time = matches?.[2] || "?";

  return (
    `${getFlair()} ` +
    L`Webpack compiled ${numAssets} assets & ${numModules} modules in ${time} ms` +
    "\n"
  );
}

function printSiteVariables() {
  const variables = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "site.dev.json"), "utf-8"),
  );
  Object.keys(variables).forEach((name) => {
    console.log(B`${name}` + ":", variables[name]);
  });
}

const WEBSOCKET_PORT = 35729;
const SHORTEN_WEBPACK_STDOUT = true;

const dirsToWatch = [
  path.resolve(__dirname, "../src"),
  path.resolve(__dirname, "../content"),
  path.resolve(__dirname, "../templates"),
  path.resolve(__dirname, "../public"),
  path.resolve(__dirname),
];

let isBuilding = false;
let queued = false;

const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

function broadcast(msg) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function runWebpack() {
  if (isBuilding) {
    queued = true;
    console.log(L`(waiting, Webpack is still building)`);
    return;
  }
  isBuilding = true;

  exec("npx webpack --config webpack/config.dev.js", (err, stdout, stderr) => {
    if (stdout) {
      if (SHORTEN_WEBPACK_STDOUT) {
        process.stdout.write(shortenWebpackOutput(stdout));
      } else {
        process.stdout.write(stdout);
      }
    }

    if (stderr) {
      process.stderr.write(stderr);
    }

    if (err) {
      console.error(R`Webpack build failed: ${err.message}`);
    } else {
      broadcast("reload");
    }

    isBuilding = false;
    if (queued) {
      queued = false;
      // Run one more time
      runWebpack();
    }
  });
}

const watcher = chokidar.watch(dirsToWatch, {
  ignored: /(^|[\/\\])\../,
  // Don't need an initial event, we call runWebpack() below
  ignoreInitial: true,
  interval: 500,
});

watcher.on("all", (event, filePath) => {
  const { base } = path.parse(filePath);
  const isDevSiteVariables = base === "site.dev.json";

  const relativePath = path.relative(process.cwd(), filePath);
  switch (event) {
    case "change":
      console.log(P`${relativePath}`, "changed, building...");
      if (isDevSiteVariables) {
        printSiteVariables();
      }
      runWebpack();
      return;
    case "error":
      return;
  }
});

const child = spawn("node", ["webpack/serve.js"], { stdio: "inherit" });

child.on("close", (code) => {
  console.log(`Web server exited with code ${code}`);
});

console.log("WebSocket server:", B`ws://localhost:${WEBSOCKET_PORT}`);

printSiteVariables();
runWebpack();
