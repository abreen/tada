const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");
const _ = require("lodash");
const fm = require("front-matter");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { convertMarkdown: curlyQuote } = require("quote-quote");

function createTemplateParameters(pageVariables, siteVariables, content) {
  return {
    site: siteVariables,
    base: siteVariables.base,
    basePath: siteVariables.basePath,
    page: pageVariables,
    content,
    isoDate,
    readableDate,
  };
}

/** Create one HtmlWebpackPlugin for each input file in content/ */
function createHtmlPlugins(siteVariables) {
  const contentDir = getContentDir();
  const contentFiles = getContentFiles(contentDir);

  return contentFiles.map((filePath) => {
    const rel = path.relative(contentDir, filePath);
    const name = rel.replace(/\.(md|html)$/, "");

    const { html, pageVariables } = renderContent(filePath, siteVariables);

    return new HtmlWebpackPlugin({
      filename: `${name}.html`,
      template: path.resolve(__dirname, "..", "src/template.html"),
      templateParameters: createTemplateParameters(
        pageVariables,
        siteVariables,
        html,
      ),
      inject: "head",
    });
  });
}

/** Parses the file, renders using template, returns HTML & params used to generate page */
function renderContent(filePath, siteVariables) {
  const md = createMarkdown(siteVariables);

  const ext = path.extname(filePath);
  const raw = fs.readFileSync(filePath, "utf-8");

  const { pageVariables, content } = parseFrontMatterAndContent(raw, ext);

  // Handle substitutions inside page variables using siteVariables
  const siteOnlyParams = createTemplateParameters({}, siteVariables, null);
  const pageVariablesProcessed = Object.entries(pageVariables)
    .map(([k, v]) => {
      const newValue = _.template(v)(siteOnlyParams);
      return [k, newValue];
    })
    .reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});

  const strippedContent = stripHtmlComments(content);

  const params = createTemplateParameters(
    pageVariablesProcessed,
    siteVariables,
    strippedContent,
  );

  let html = _.template(strippedContent)(params);

  if (extensionIsMarkdown(ext)) {
    html = md.render(html);
  }

  return { html, pageVariables: params.page };
}

function stripHtmlComments(str) {
  return str.replace(/<!---?[\s\S]*?-->/g, "");
}

function getContentDir() {
  return path.resolve(__dirname, "..", "content");
}

function getDistDir() {
  return path.resolve(__dirname, "..", "dist");
}

function getContentFiles(contentDir) {
  function walk(dir) {
    return fs.readdirSync(dir).flatMap((file) => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        return walk(fullPath);
      } else if (/\.(md|html)$/.test(file)) {
        return [fullPath];
      }
      return [];
    });
  }
  return walk(contentDir);
}

function extensionIsMarkdown(ext) {
  return [".md", ".markdown"].includes(ext);
}

function capitalize(str) {
  if (str.length < 2) {
    return str;
  }

  return str[0].toUpperCase() + str.slice(1);
}

function createMarkdown(siteVariables) {
  const markdown = new MarkdownIt({ html: true, typographer: true });
  return markdown
    .use(require("markdown-it-anchor"), { tabIndex: false })
    .use(require("markdown-it-footnote"))
    .use(require("markdown-it-multimd-table"))
    .use(require("markdown-it-external-links"), {
      externalClassName: "external",
      externalTarget: "_blank",
      internalDomains: siteVariables.internalDomains,
    })
    .use(require("markdown-it-container"), "details", {
      marker: "<",
      validate: function (params) {
        return params.trim().match(/^details\s+(.*)$/);
      },

      render: function (tokens, idx) {
        var m = tokens[idx].info.trim().match(/^details\s+(.*)$/);

        if (tokens[idx].nesting === 1) {
          return (
            "<details><summary>" +
            markdown.utils.escapeHtml(m[1]) +
            '</summary><div class="content">\n'
          );
        } else {
          return "</div></details>\n";
        }
      },
    })
    .use(require("markdown-it-container"), "section", {
      marker: ":",
      validate: function (params) {
        return params.trim().match(/^section\s+(.*)$/);
      },
      render: function (tokens, idx) {
        const matches = tokens[idx].info.trim().match(/^section\s+(.*)$/);

        if (tokens[idx].nesting === 1) {
          const sectionTitle =
            matches &&
            matches[1] &&
            markdown.utils.escapeHtml(curlyQuote(matches[1]));
          if (sectionTitle) {
            return `<section><h2>${sectionTitle}</h2>\n`;
          } else {
            return "<section>\n";
          }
        } else {
          return "</section>\n";
        }
      },
    })
    .use(require("markdown-it-container"), "alert", {
      marker: "!",
      validate: function (params) {
        return params.trim().match(/^(note|warning)\s*"?(.+)?"?$/);
      },
      render: function (tokens, idx) {
        const matches = tokens[idx].info
          .trim()
          .match(/^(note|warning)\s*"?(.+)?"?$/);

        if (tokens[idx].nesting === 1) {
          const classNames = ["alert"];
          const type = matches && matches[1]?.trim();
          if (type) {
            classNames.push(type);
          }

          const title =
            (matches && matches[2]?.trim()) ||
            (type == "note" || type == "warning" ? capitalize(type) : null);

          let html = `<div class="${classNames.join(" ")}">`;
          if (title) {
            html += `<p class="title">${markdown.utils.escapeHtml(curlyQuote(title))}</p>\n`;
          }
          return html;
        } else {
          return "</div>\n";
        }
      },
    });
}

function parseFrontMatterAndContent(raw, ext) {
  const { frontMatter, content } = parseFrontMatter(raw, ext);

  // Add delimiters to satisfy the front-matter library
  const result = fm(`---\n${frontMatter}\n---\n`);

  return { pageVariables: result.attributes, content };
}

function parseFrontMatter(rawContent, ext) {
  if (extensionIsMarkdown(ext)) {
    // Markdown front matter: key: value lines until first blank line, including YAML multi-line (|) values
    const lines = rawContent.split(/\r?\n/);
    const fmLines = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) break; // stop at first completely blank line

      fmLines.push(line);

      // Handle YAML multi-line | syntax
      if (line.match(/:\s*\|$/)) {
        i++;
        while (i < lines.length && /^\s+/.test(lines[i])) {
          fmLines.push(lines[i]);
          i++;
        }
        continue;
      }

      i++;
    }

    if (fmLines.length === 0) {
      return { frontMatter: null, content: rawContent };
    }

    const frontMatter = fmLines.join("\n");
    const content = lines.slice(i).join("\n");
    return { frontMatter, content };
  } else if (ext === ".html") {
    // HTML front matter: <!--- … --> at the very top
    const match = rawContent.match(/^<!---\s*([\s\S]*?)\s*-->/);
    if (!match) {
      return { frontMatter: null, content: rawContent };
    }

    const frontMatter = match[1];
    const content = rawContent.slice(match[0].length);
    return { frontMatter, content };
  } else {
    // unknown type, return raw
    return { frontMatter: null, content: rawContent };
  }
}

function readableDate(date) {
  if (date == null || date == "") {
    return "";
  }

  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  const str = date.toISOString();
  const year = str.slice(0, 4);
  let month = str.slice(5, 7);
  if (month[0] === "0") {
    month = month[1];
  }
  let day = str.slice(8, 10);
  if (day[0] === "0") {
    day = day[1];
  }

  const months = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };

  return `${months[month]} ${day}, ${year}`;
}

function isoDate(str) {
  if (str == null || str == "") {
    return null;
  }
  const date = new Date(str);
  return date.toISOString().slice(0, 10);
}

module.exports = {
  createHtmlPlugins,
  createMarkdown,
  renderContent,
  getContentDir,
  getDistDir,
  getContentFiles,
  extensionIsMarkdown,
  parseFrontMatter,
};
