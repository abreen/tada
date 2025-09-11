const express = require("express");
const { getDistDir } = require("./util");
const { makeLogger } = require("./log");
const { B } = require("./colors");

const log = makeLogger(__filename, "debug");

function messageReady(port) {
  if (process.send) {
    process.send({ ready: true, port });
  }
}

const app = express();

try {
  const distDir = getDistDir();
  app.use(express.static(distDir));
} catch (err) {
  log.error`Failed to serve files in "${distDir}": ${err}`;
  process.exit(1);
}

function tryListen(port, fallbackPort) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      log.note`Local development web server: ${B`http://localhost:${port}`}`;
      messageReady(port);
      resolve(server);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE" && fallbackPort) {
        log.warn`Port ${port} in use, trying fallback ${fallbackPort}...`;
        return tryListen(fallbackPort, null)
          .then(() => {
            messageReady(fallbackPort);
            resolve();
          })
          .catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

tryListen(8080, 8081).catch((err) => {
  log.error`Failed to start server: ${err}`;
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  log.error`Uncaught exception: ${err}`;
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log.error`Unhandled rejection: ${reason}`;
  process.exit(1);
});
