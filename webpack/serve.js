const express = require("express");
const { getDistDir } = require("./util");

const app = express();
app.use(express.static(getDistDir()));

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Web server running at http://localhost:${PORT}`);
});
