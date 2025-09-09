const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const JsonSchemaCompiler = require("ajv");

// Store all templates in memory (don't read template files during build)
const templates = {};

// All parsed data (from .json files)
const jsonData = {};

// Compiled JSON Schema for the .json files
const validators = {};

const compiler = new JsonSchemaCompiler();

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

  fs.readdirSync(templatesDir).forEach((fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    const isSchema = fileName.toLowerCase().endsWith(".schema.json");
    if (isSchema) {
      return;
    }

    const filePath = path.join(templatesDir, fileName);

    if (ext === ".html") {
      templates[fileName] = fs.readFileSync(filePath, "utf-8");
    } else if (ext === ".json") {
      const schemaFile = `${path.parse(fileName).name}.schema.json`;
      const schemaPath = path.join(templatesDir, schemaFile);
      if (fs.existsSync(schemaPath)) {
        compileJsonSchema(schemaPath, fileName);
      }

      jsonData[fileName] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      if (validators[fileName]) {
        validateSchema(fileName, validators[fileName], jsonData[fileName]);
      } else {
        console.warn(`warning: missing JSON Schema for ${fileName}`);
      }
    }
  });
}

function compileJsonSchema(schemaPath, fileName) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  validators[fileName] = compiler.compile(schema);
}

function validateSchema(fileName, validator, json) {
  const valid = validator(json);
  if (!valid) {
    validator.errors.forEach((error) => {
      console.error(error);
    });
    throw new Error(`JSON file failed validation: ${fileName}`);
  }
}

module.exports = {
  compileTemplates,
  render,
};
