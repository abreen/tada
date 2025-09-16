const fs = require("fs")
const path = require("path")
const { JSDOM } = require("jsdom")
const MiniSearch = require("minisearch")
const searchOptions = require("../src/search/options.json")
const { createApplyBasePath } = require("./util")
const { makeLogger } = require("./log")

const log = makeLogger(__filename)

class MiniSearchIndexPlugin {
  constructor(siteVariables, options = {}) {
    if (typeof searchOptions === "object") {
      options = { ...searchOptions, ...options }
    }
    this.filename = options.filename
    this.fields = options.fields
    this.storeFields = options.storeFields
    this.siteVariables = siteVariables
    this.applyBasePath = createApplyBasePath(siteVariables)
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync(
      "MiniSearchIndexPlugin",
      async (compilation, callback) => {
        try {
          const distDir =
            compiler.options &&
            compiler.options.output &&
            compiler.options.output.path
              ? compiler.options.output.path
              : compiler.outputPath || compilation.compiler.outputPath

          function walk(dir) {
            let results = []
            const list = fs.readdirSync(dir, { withFileTypes: true })
            list.forEach(entry => {
              const full = path.join(dir, entry.name)
              if (entry.isDirectory()) {
                results = results.concat(walk(full))
              } else if (entry.isFile() && entry.name.endsWith(".html")) {
                results.push(full)
              }
            })
            return results
          }

          const htmlFiles = walk(distDir)

          const documents = htmlFiles
            .map(file => {
              const html = fs.readFileSync(file, "utf8")
              const dom = new JSDOM(html)
              const doc = dom.window.document

              const main = doc.querySelector("main")
              if (!main) {
                log.warn`No <main> element found in ${file}, not indexing`
                return null
              }

              const content = main
                ? Array.from(main.childNodes)
                    .map(node =>
                      node.nodeType === 3 // Text node
                        ? node.textContent
                        : node.nodeType === 1 // Element node
                          ? node.textContent + " "
                          : "",
                    )
                    .join("")
                    .replace(/\s+/g, " ")
                    .trim()
                : ""

              /*
               * Find the <title> element and clean it up
               */
              const titleEl = doc.querySelector("title")
              let title = (titleEl.textContent || "").trim()

              if (this.siteVariables.titlePostfix) {
                const postfix = this.siteVariables.titlePostfix
                if (title.endsWith(postfix)) {
                  title = title.slice(0, -postfix.length).trim()
                }
              }

              const rel = path.relative(distDir, file).replace(/\\/g, "/")
              const url = this.applyBasePath("/" + rel)
              return {
                id: url,
                title,
                url,
                content,
                excerpt: content.slice(0, 200),
              }
            })
            .filter(doc => doc !== null)

          if (documents.length === 0) {
            throw new Error("no documents found to index")
          }

          if (!this.fields || this.fields.length === 0) {
            throw new Error("no fields specified for indexing")
          }

          const miniSearch = new MiniSearch({
            fields: this.fields,
            storeFields: this.storeFields,
            tokenize: (string, _fieldName) => {
              if (_fieldName === "content" || _fieldName === "excerpt") {
                return string.split(/[\n\r\p{Z}\p{P}(){}\[\]=\-+*|]+/u)
              } else {
                return string.split(/[\n\r\p{Z}\p{P}]+/u)
              }
            },
          })

          miniSearch.addAll(documents)

          // Serialize index to JSON and write to output
          const serialized = JSON.stringify(miniSearch.toJSON())
          const outPath = path.join(distDir, this.filename)
          fs.writeFileSync(outPath, serialized, "utf8")

          try {
            const source = fs.readFileSync(outPath)
            compilation.assets = compilation.assets || {}
            compilation.assets[this.filename] = {
              source: () => source,
              size: () => source.length,
            }
          } catch (e) {
            log.error`Failed to add ${this.filename} to assets: ${e.message}`
          }

          callback()
        } catch (err) {
          log.error`Error building search index: ${err.message}`
          compilation.errors.push(err)
          callback(err)
        }
      },
    )
  }
}

module.exports = MiniSearchIndexPlugin
