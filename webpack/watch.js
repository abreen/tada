#!/usr/bin/env node
const chokidar = require("chokidar");
const { exec, spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

const dirsToWatch = [
  path.resolve(__dirname, "../src"),
  path.resolve(__dirname, "../content"),
  path.resolve(__dirname, "../public"),
  path.resolve(__dirname),
];

let isBuilding = false;
let queued = false;

const wss = new WebSocket.Server({ port: 35729 });

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
    return;
  }
  isBuilding = true;

  exec("npx webpack --config webpack/config.dev.js", (err, stdout, stderr) => {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);

    if (err) {
      console.error(`Webpack build failed: ${err.message}`);
    } else {
      broadcast("reload");
    }

    isBuilding = false;
    if (queued) {
      queued = false;
      runWebpack();
    }
  });
}

const watcher = chokidar.watch(dirsToWatch, {
  ignored: /(^|[\/\\])\../,
  ignoreInitial: true,
});

watcher.on("all", (event, filePath) => {
  console.log(`[${event}] ${filePath}`);
  runWebpack();
});

const child = spawn("node", ["webpack/serve.js"], { stdio: "inherit" });

child.on("close", (code) => {
  console.log(`Web server exited with code ${code}`);
});

console.log("Watching for changes in:", dirsToWatch.join(", "));
console.log("WebSocket server running on ws://localhost:35729");

runWebpack();
