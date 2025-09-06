# `tada` 🎉

A flexible static site. Generates HTML and JS using Webpack.


## Setup

You need [Node.js][node] version 22 or greater. After installing,
verify versions with `node --version` and `npm --version`.

1. In this directory, do `npm install` to fetch dependencies
2. While that runs, examine the `content/` directory
3. Examine `src/template.html` (uses [Lodash template syntax][lodash])
3. Examine `site.dev.json` and `site.prod.json` (build-time variables)
4. Examine `scripts` property of `package.json`

Here are the available scripts:

### `npm run dev`

Build the site for local development (using `config.dev.js` and `site.dev.json`)
into the `dist/` directory.

> [!NOTE]
> Change the `site.base` and `site.basePath` variables as needed.

### `npm run serve`

Start a development web server at `http://localhost:8080` which serves the
files in the `dist/` directory.

### `npm run watch`

Watch this directory for changes. When a file changes, `npm run dev` runs
automatically. In the background, `npm run serve` runs to make the site
available at `http://localhost:8080`.

### `npm run build`

When you are happy with your changes, use `npm run build` to build the site
for production (using `config.prod.js` and `site.prod.json`).
For example, you can then upload `dist/` to S3 or a public-facing web server.

###  `npm run format`

Invoke Prettier to fix code formatting across all files.

> [!TIP]
> We intentionally use the default Pretter config, so there's no `.prettierrc` file.


## Building

The static site is built and saved to `dist/`.

- `content/` contains Markdown, HTML, PDF, and other files to be processed
- `src/` contains the site's JavaScript code
- All files in `public/` are copied directly into `dist/`

Each file in `content/` should start with "front matter" (a YAML-formatted
list of variables parsed using the [`front-matter`][front-matter] library).


### HTML

HTML content is inserted into the `<main>` element.

* HTML comments starting with two hyphens (`<!--`) appear in the final page
* But comments with three hyphens (`<!---`) **are removed**

Example front matter:

```html
<!---
title: Title of Page
author: Author name
-->

<p>Foo <b>bar</b> <i>baz</i> <a href="google.com">Google</a></p>
```

### Markdown

Markdown is converted to HTML using the [MarkdownIt][markdownit] library
and inserted into the `<main>` element.

Example front matter:

```markdown
title: Title of Page
author: Author name

Foo **bar** _baz_ [Google](google.com)
```

These MarkdownIt plugins are installed by default:

#### [markdown-it-anchor](https://www.npmjs.com/package/markdown-it-anchor)

Adds `id` attribute to headings.

#### [markdown-it-container](https://www.npmjs.com/package/markdown-it-container)

Used to implement 3 different kinds of Markdown blocks:

1. `<details>` element (collapsible/expandible)
2. `<section>` element (logical grouping with a `<h2>` heading)
3. Alerts (`<div class="alert">`)

To define a `<details>` element, use this syntax:

```
<<< details Title for the details element

The content in the element, initially hidden

<<<
```

* The text after `details` is used for the `<summary>` element and always shows
* Don't forget the closing `<<<`

To define a `<section>` element, use this syntax:

```
::: section Text for `<h2>` heading

Any content...

:::
```

Finally, to define an alert element, use this syntax:

```
!!! warning

Any content...

!!!
```

This is usually rendered as yellow box with a warning icon.

```
!!! note See the FAQ

You may want to review [the FAQ][faq].

!!!
```

The `note` alert is usually blue. The default title of "Note"
is overridden here by "See the FAQ".

* There are two variations: `note` and `warning`
* Override the default title by specifying the optional text

#### [markdown-it-external-links](https://www.npmjs.com/package/markdown-it-external-links)

Adds the `.external` CSS class to links that fall outside of the domains specified
in the `internalDomains` site variable. See `site.dev.json` and `site.prod.json`.

#### [markdown-it-footnote](https://www.npmjs.com/package/markdown-it-footnote)

Adds support for footnotes.

#### [markdown-it-multimd-table](https://www.npmjs.com/package/markdown-it-multimd-table)

Adds support for tables.


### PDFs (in progress)

Each page of a PDF in `content/` is first converted to a vector image, then
a separate web page is generated for each page. For example, the PDF file
located at `content/ps1/intro.pdf` would be converted to multiple HTML pages:

- `dist/ps1/intro.pdf/index.html` or `dist/ps1/intro.pdf/1.html`
- `dist/ps1/intro.pdf/2.html`
- `dist/ps1/intro.pdf/3.html`

### Search index (in progress)

After all content is processed, a search index JSON file is built using
[MiniSearch][minisearch] and saved to `dist/`. See the client-side code in
`src/search.ts`.

### Variable substitution

Plain text content (e.g., HTML and Markdown) are be processed using [Lodash
templates][lodash].

- Variables in `site.json` are available under `site`, e.g., this Markdown code
  uses the `courseId` variable:

  ```markdown
  [external]: https://institution.edu/courses/<%= site.courseId %>)
  ```

- Variables defined at the top of a file are available in the body of the file
  under `page` (e.g., `page.title`)


[lodash]: https://lodash.info/doc/template
[minisearch]: https://lucaong.github.io/minisearch/
[node]: https://nodejs.org/
[front-matter]: https://www.npmjs.com/package/front-matter
[markdownit]: https://www.npmjs.com/package/markdown-it
