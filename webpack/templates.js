const fs = require("fs");
const path = require("path");
const _ = require("lodash");

// Store all templates in memory (don't read template files during build)
const templates = {};

// Store all parsed JSON data
const jsonData = {};

function getTemplatesDir() {
  return path.resolve(__dirname, "../templates");
}

function json(fileName) {
  return jsonData[fileName];
}

function render(fileName, params) {
  if (params != null) {
    params.json = json;
    params.render = (otherFileName) => {
      return render(otherFileName, params);
    };
  }

  return _.template(templates[fileName])(params);
}

function compileTemplates() {
  const templatesDir = getTemplatesDir();
  const files = fs.readdirSync(templatesDir);
  files.forEach((fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    const filePath = path.join(templatesDir, fileName);
    if (ext === ".html") {
      templates[fileName] = fs.readFileSync(filePath, "utf-8");
    } else if (ext === ".json") {
      jsonData[fileName] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  });

  console.debug("templates: ", Object.keys(templates));
  console.debug("JSON data: ", Object.keys(jsonData));
}

module.exports = {
  compileTemplates,
  render,
};
