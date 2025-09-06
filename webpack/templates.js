/*
 * Template handling
 */

const _ = require("lodash");

// TODO cache templates without "page." in them? e.g. _nav.html

function getTemplatesDir() {
  return path.resolve(__dirname, "../templates");
}

function compileTemplates() {
  return {
    default: _.template("<html><body><p>Hello, <%= name =>!</p></body></html>"),
  };
}

module.exports = {
  compileTemplates,
};
