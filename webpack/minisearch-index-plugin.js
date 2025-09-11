const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const MiniSearch = require("minisearch");
const searchOptions = require("../src/search/options.json");

class MiniSearchIndexPlugin {
  constructor(siteVariables, options = {}) {
    if (typeof searchOptions === "object") {
      options = { ...searchOptions, ...options };
    }
    this.filename = options.filename;
    this.fields = options.fields;
    this.storeFields = options.storeFields;
    this.siteVariables = siteVariables;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync(
      "MiniSearchIndexPlugin",
      async (compilation, callback) => {
        try {
          const outDir =
            compiler.options &&
            compiler.options.output &&
            compiler.options.output.path
              ? compiler.options.output.path
              : compiler.outputPath || compilation.compiler.outputPath;

          // recursively gather .html files from output directory
          function walk(dir) {
            let results = [];
            const list = fs.readdirSync(dir, { withFileTypes: true });
            list.forEach((entry) => {
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                results = results.concat(walk(full));
              } else if (entry.isFile() && entry.name.endsWith(".html")) {
                results.push(full);
              }
            });
            return results;
          }

          if (!fs.existsSync(outDir)) {
            compilation.warnings.push(
              new Error(
                "MiniSearchIndexPlugin: output directory does not exist: " +
                  outDir,
              ),
            );
            return callback();
          }

          const htmlFiles = walk(outDir);

          const documents = htmlFiles.map((file) => {
            const html = fs.readFileSync(file, "utf8");
            const dom = new JSDOM(html);
            const doc = dom.window.document;

            const main = doc.querySelector("main");
            if (!main) {
              compilation.warnings.push(
                new Error(
                  `MiniSearchIndexPlugin: no <main> element found in ${file}, skipping`,
                ),
              );
            }

            const content = main
              ? Array.from(main.childNodes)
                  .map((node) =>
                    node.nodeType === 3 // Text node
                      ? node.textContent
                      : node.nodeType === 1 // Element node
                        ? node.textContent + " "
                        : "",
                  )
                  .join("")
                  .replace(/\s+/g, " ")
                  .trim()
              : "";

            const titleEl =
              doc.querySelector("title") || doc.querySelector("h1");
            const title = titleEl
              ? (titleEl.textContent || "").trim()
              : path.basename(file, ".html");

            const rel = path.relative(outDir, file).replace(/\\/g, "/");
            const url = rel === "index.html" ? "/" : "/" + rel;

            const excerpt = content.slice(0, 200);

            return {
              id: url,
              title,
              url,
              content,
              excerpt,
            };
          });

          // Build MiniSearch index
          const miniSearch = new MiniSearch({
            fields: this.fields,
            storeFields: this.storeFields,
            tokenize: (string, _fieldName) => {
              if (_fieldName === "content" || _fieldName === "excerpt") {
                return string.split(/[\n\r\p{Z}\p{P}(){}\[\]=\-+*|]+/u);
              } else {
                return string.split(/[\n\r\p{Z}\p{P}]+/u);
              }
            },
          });

          miniSearch.addAll(documents);

          // Serialize index to JSON and write to output
          const serialized = JSON.stringify(miniSearch.toJSON());
          const outPath = path.join(outDir, this.filename);
          fs.writeFileSync(outPath, serialized, "utf8");

          // add the generated file to the webpack assets so that it is visible in compilation
          try {
            const source = fs.readFileSync(outPath);
            compilation.assets = compilation.assets || {};
            compilation.assets[this.filename] = {
              source: () => source,
              size: () => source.length,
            };
          } catch (e) {
            // ignore if we couldn't attach
          }

          callback();
        } catch (err) {
          compilation.errors.push(err);
          callback(err);
        }
      },
    );
  }
}

module.exports = MiniSearchIndexPlugin;
