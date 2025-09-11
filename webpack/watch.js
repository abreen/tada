#!/usr/bin/env node
const chokidar = require("chokidar");
const { execSync, fork } = require("child_process");
const path = require("path");
const WebSocket = require("ws");
const FLAIR_STRINGS = require("./flair.json");
const { I, G } = require("./colors");
const { makeLogger } = require("./log");
const { getDevSiteVariables } = require("./site-variables");

const WEBSOCKET_PORT = 35729;
const SHORTEN_WEBPACK_STDOUT = true;

const DIRS_TO_WATCH = [
  path.resolve(__dirname, "../src"),
  path.resolve(__dirname, "../content"),
  path.resolve(__dirname, "../templates"),
  path.resolve(__dirname, "../public"),
  path.resolve(__dirname),
];

const log = makeLogger(__filename);
const wslog = makeLogger("WebSocket");

function getFlair() {
  const i = Math.floor(Math.random() * FLAIR_STRINGS.length);
  return I`${FLAIR_STRINGS[i]}!` + " 🎉";
}

function shortenWebpackOutput(output) {
  const matches = output.match(/webpack ([\d.]+) compiled .+ in (\d+) ms\n/);
  let time = matches?.[2];
  if (time != null) {
    time = parseFloat(time);
    if (time >= 1000) {
      time = (time / 1000).toFixed(2) + " s";
    } else {
      time = time + " ms";
    }
  }

  return (
    `${getFlair()} Webpack ${matches?.[1] || ""} compiled` +
    (time != null ? ` in ${time}` : "") +
    "\n"
  );
}

function printSiteVariables() {
  const variables = getDevSiteVariables();
  console.log("Site variables (site.dev.json):");
  console.dir(variables);
}

function broadcast(msg) {
  if (wss == null || !webSocketsReady) {
    return;
  }
  wslog.debug(`Broadcasting "${msg}" to WebSocket clients...`);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function serve() {
  const child = fork(path.join(__dirname, "serve.js"), { stdio: "inherit" });
  child.on("close", (code) => {
    webServerReady = false;
    log.error`Web server exited with code ${code}`;
    process.exit(2);
  });
  child.on("error", (err) => {
    webServerReady = false;
    log.error`Web server failed: ${err.message}`;
  });
  child.on("message", (msg) => {
    if (msg.ready) {
      webServerReady = true;
      clearTimeout(webServerTimeout);

      if (lastBuildFailed) {
        // Let the user fix the build while the web server stays running
        waitingToOpenBrowser = true;
        return;
      }

      log.note`Web server is ready, opening browser...`;
      openBrowser();
    }
  });

  webServerTimeout = setTimeout(() => {
    if (webServerReady) {
      return;
    }
    log.error`Web server failed to report within 10 seconds, exiting`;
    process.exit(3);
  }, 10000);
}

function runWebpack(initialBuild = false) {
  if (isBuilding) {
    queued = true;
    log.note`(waiting, Webpack is still building)`;
    return;
  }
  if (!initialBuild && !webServerReady) {
    log.note`(waiting, web server is not ready)`;
    return;
  }

  isBuilding = true;

  try {
    const stdout = execSync("npx webpack --config webpack/config.dev.js", {
      stdio: "pipe",
    }).toString();
    if (SHORTEN_WEBPACK_STDOUT && !stdout.includes("error")) {
      process.stdout.write(shortenWebpackOutput(stdout));
    } else {
      process.stdout.write(stdout);
    }

    lastBuildFailed = false;

    broadcast("reload");

    if (waitingToOpenBrowser && webServerReady) {
      waitingToOpenBrowser = false;
      log.note`Webpack is building now, opening browser...`;
      openBrowser();
    }
  } catch (err) {
    lastBuildFailed = true;
    if (err.stdout) {
      process.stdout.write(err.stdout.toString());
    }

    if (err.stderr) {
      process.stderr.write(err.stderr.toString());
    }

    log.error`Build failed: ${err.message}`;
  } finally {
    isBuilding = false;
    if (queued) {
      queued = false;
      // Run one more time
      runWebpack();
    }
  }
}

const watcher = chokidar.watch(DIRS_TO_WATCH, {
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
      console.log(G`${relativePath}` + " changed, building...");
      if (isDevSiteVariables) {
        printSiteVariables();
      }
      runWebpack();
      return;
    case "error":
      return;
  }
});

function openBrowser() {
  import("open").then(({ default: open }) => {
    open(`http://localhost:8080/`);
  });
}

let isBuilding = false;
let queued = false;
let lastBuildFailed = false;
let webSocketsReady = false;
let webServerReady = false;
let webServerTimeout;
let waitingToOpenBrowser = false;

let wss = null;
try {
  wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

  wss.on("connection", (conn) => {
    wslog.debug`WebSocket client connected`;
    conn.on("close", () => {
      wslog.debug`WebSocket client disconnected`;
    });
  });

  wss.on("error", (err) => {
    wslog.error`WebSocket server error: ${err.message}`;
  });

  wss.on("listening", () => {
    wslog.note`WebSocket server listening at ws://localhost:${WEBSOCKET_PORT}`;
    webSocketsReady = true;
  });
} catch (err) {
  wslog.error`Failed to start WebSocket server on port ${WEBSOCKET_PORT}: ${err.message}`;
}

printSiteVariables();
console.log("Running initial build...");
runWebpack(true);
serve();
