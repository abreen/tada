const express = require("express");
const { getDistDir } = require("./util");
const { R, B } = require("./colors");

const app = express();

try {
  const distDir = getDistDir();
  app.use(express.static(distDir));
} catch (err) {
  console.error(R`Failed to serve files in "${distDir}":`, err);
  process.exit(1);
}

function tryListen(port, fallbackPort) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log("Local development web server:", B`http://localhost:${port}`);
      resolve(server);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE" && fallbackPort) {
        console.warn(`Port ${port} in use, trying fallback ${fallbackPort}...`);
        tryListen(fallbackPort, null).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

tryListen(8080, 8081).catch((err) => {
  console.error(R`Failed to start server:`, err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error(R`Uncaught exception:`, err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error(R`Unhandled rejection:`, reason);
  process.exit(1);
});
