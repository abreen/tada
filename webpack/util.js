const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");
const _ = require("lodash");
const fm = require("front-matter");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { DefinePlugin } = require("webpack");
const { convertMarkdown: curlyQuote } = require("quote-quote");
const { stripHtml } = require("string-strip-html");
const { compileTemplates, render } = require("./templates");
const { extractPdfPageSvgs } = require("./pdf-to-svg");

function createTemplateParameters(
  pageVariables,
  siteVariables,
  content,
  applyBasePath,
) {
  return {
    site: siteVariables,
    base: siteVariables.base,
    basePath: siteVariables.basePath,
    page: pageVariables,
    content,
    applyBasePath,
    isoDate,
    readableDate,
    cx: classNames,
  };
}

/** Create one HtmlWebpackPlugin for each input file in content/ */
async function createHtmlPlugins(siteVariables) {
  compileTemplates();

  const contentDir = getContentDir();
  const contentFiles = getContentFiles(contentDir);
  const distDir = getDistDir();

  function applyBasePath(subPath) {
    if (!subPath.startsWith("/")) {
      throw new Error('invalid internal path, must start with "/": ' + subPath);
    }

    let path = siteVariables.basePath || "/";
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path + subPath;
  }

  const plugins = [];

  for (const filePath of contentFiles) {
    const { dir, name, ext } = path.parse(filePath);

    if ([".html", ".md", ".markdown"].includes(ext.toLowerCase())) {
      const { content, pageVariables } = renderContent(
        filePath,
        siteVariables,
        applyBasePath,
      );
      if (!pageVariables.template) {
        pageVariables.template = "default";
      }
      const templateParameters = createTemplateParameters(
        pageVariables,
        siteVariables,
        content,
        applyBasePath,
      );
      const html = render(`${pageVariables.template}.html`, templateParameters);
      plugins.push(
        new HtmlWebpackPlugin({
          filename: path.format({
            dir: path.relative(contentDir, dir),
            base: `${name}.html`,
          }),
          templateContent: html,
          inject: "head",
        }),
      );
    } else if (ext.toLowerCase() === ".pdf") {
      const subPath = path.relative(contentDir, path.join(dir, name));
      const pdfFilePath = `${applyBasePath("/" + subPath)}/${name + ext}`;

      const pages = (await extractPdfPageSvgs(filePath)).map((svg, i, arr) => {
        const hasPrev = i > 0,
          hasNext = i < arr.length - 1;
        const pageNum = i + 1;
        const titleHtml = `<tt>${name + ext}</tt> (${pageNum} of ${arr.length})`;
        const templateParameters = createTemplateParameters(
          {
            template: "pdf",
            filePath,
            pageNumber: pageNum,
            prevUrl: hasPrev
              ? `${applyBasePath("/" + subPath)}/page-${pageNum - 1}.html`
              : null,
            nextUrl: hasNext
              ? `${applyBasePath("/" + subPath)}/page-${pageNum + 1}.html`
              : null,
            title: stripHtml(titleHtml).result,
            titleHtml,
            pdfFilePath,
          },
          siteVariables,
          svg,
          applyBasePath,
        );

        const html = render("pdf.html", templateParameters);

        return new HtmlWebpackPlugin({
          filename: path.format({
            dir: subPath,
            base: `page-${pageNum}.html`,
          }),
          templateContent: html,
          inject: "head",
        });
      });

      const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=./page-1.html" />
    <script>
      window.location.href = './page-1.html';
    </script>
  </head>
</html>
`;
      plugins.push(
        new HtmlWebpackPlugin({
          filename: path.format({
            dir: subPath,
            base: "index.html",
          }),
          templateContent: indexHtml,
          inject: false,
        }),
      );

      // Copy the entire PDF file to dist/
      const to = path.format({
        dir: path.join(distDir, subPath),
        base: name + ext,
      });
      plugins.push(new CopyPlugin({ patterns: [{ from: filePath, to }] }));

      plugins.push(...pages);
    }
  }

  return plugins;
}

/** Parses the file, renders using template, returns HTML & params used to generate page */
function renderContent(filePath, siteVariables, applyBasePath) {
  const md = createMarkdown(siteVariables);

  const ext = path.extname(filePath);
  const raw = fs.readFileSync(filePath, "utf-8");

  const { pageVariables, content } = parseFrontMatterAndContent(raw, ext);

  // Handle substitutions inside page variables using siteVariables
  const siteOnlyParams = createTemplateParameters(
    {},
    siteVariables,
    null,
    applyBasePath,
  );
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
    applyBasePath,
  );

  let html = _.template(strippedContent)(params);

  if (extensionIsMarkdown(ext)) {
    html = md.render(html);
  }

  return { content: html, pageVariables: params.page };
}

function stripHtmlComments(str) {
  return str.replace(/<!---[\s\S]*?-->/g, "");
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
      } else if (/\.(md|html|pdf)$/.test(file)) {
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

function classNames(obj) {
  const names = [];
  for (const key in obj) {
    if (!!obj[key]) {
      names.push(key);
    }
  }
  return names.join(" ");
}

function textToId(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

function createMarkdown(siteVariables) {
  const markdown = new MarkdownIt({ html: true, typographer: true })
    .use(require("markdown-it-anchor"), { tabIndex: false })
    .use(require("markdown-it-footnote"))
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
            return `<section><h2 id="${textToId(sectionTitle)}">${sectionTitle}</h2>\n`;
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

  /*
   * Customize markdown-it-footnote renderer
   */
  markdown.renderer.rules.footnote_block_open = () =>
    '<footer class="footnotes"><p class="title">Footnotes</p><ol>';

  markdown.renderer.rules.footnote_block_close = () => "</ol></footer>";

  // Remove unused CSS class
  const footnoteOpen = markdown.renderer.rules.footnote_open;
  markdown.renderer.rules.footnote_open = (...args) =>
    footnoteOpen(...args).replace(' class="footnote-item"', "");

  // Change appearance of reference
  const caption = markdown.renderer.rules.footnote_caption;
  markdown.renderer.rules.footnote_caption = (...args) => {
    const str = caption(...args);
    return str.slice(1, str.length - 1);
  };

  // Change appearance of backreference
  const anchor = markdown.renderer.rules.footnote_anchor;
  markdown.renderer.rules.footnote_anchor = (...args) =>
    anchor(...args).replace("\u21a9\uFE0E", "⇡");

  /*
   * Customize lists (add wrapper element)
   */
  const proxy = (tokens, idx, options, env, self) =>
    self.renderToken(tokens, idx, options);

  const itemOpen = markdown.renderer.rules.list_item_open || proxy;
  markdown.renderer.rules.list_item_open = (
    tokens,
    idx,
    options,
    env,
    self,
  ) => {
    return (
      itemOpen(tokens, idx, options, env, self) +
      '<span class="styled-list-item">'
    );
  };

  const itemClose = markdown.renderer.rules.list_item_close || proxy;
  markdown.renderer.rules.list_item_close = (...args) => {
    return "</span>" + itemClose(...args);
  };

  const bulletListOpen = markdown.renderer.rules.bullet_list_open || proxy;
  markdown.renderer.rules.bullet_list_open = (
    tokens,
    idx,
    options,
    env,
    self,
  ) => {
    tokens[idx].attrJoin("class", "styled-list");
    return bulletListOpen(tokens, idx, options, env, self);
  };

  const orderedListOpen = markdown.renderer.rules.ordered_list_open || proxy;
  markdown.renderer.rules.ordered_list_open = (
    tokens,
    idx,
    options,
    env,
    self,
  ) => {
    tokens[idx].attrJoin("class", "styled-list");
    return orderedListOpen(tokens, idx, options, env, self);
  };

  return markdown;
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

function createDefinePlugin(siteVariables) {
  return new DefinePlugin({
    "window.siteVariables.base": JSON.stringify(siteVariables.base),
    "window.siteVariables.basePath": JSON.stringify(siteVariables.basePath),
    "window.siteVariables.titlePostfix": JSON.stringify(
      siteVariables.titlePostfix,
    ),
  });
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
  createDefinePlugin,
};
