const fs = require("fs")
const path = require("path")
const { compile: compileJsonSchema, doValidation } = require("./json-schema")

const DEFAULT = { basePath: "/" }

const isValid = compileJsonSchema(require("./site.schema.json"))

function getJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath), "utf-8"))
}

function getSiteVariables(env) {
  const fileName = `site.${env}.json`
  const variables = { ...DEFAULT, ...getJson(fileName) }
  doValidation(isValid, variables, fileName)
  return variables
}

function getDevSiteVariables() {
  return getSiteVariables("dev")
}

function getProdSiteVariables() {
  return getSiteVariables("prod")
}

module.exports = { getDevSiteVariables, getProdSiteVariables }
