# `tada` 🎉

A flexible static site. Generates HTML and JS using Webpack.

## Setup

You need Node and NPM. See the `package.json` file's `engines` property for the
required versions.

1. In this directory, do `npm install` to fetch dependencies
2. Examine the `content/` directory
3. Examine `site.dev.json` and `site.prod.json`
4. Examine `scripts` property of `package.json`

Here are the available scripts:

### `npm run dev`

Build the site for local development (using `config.dev.js` and `site.dev.json`)
into the `dist/` directory.

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


## Building

The static site is built and saved to `dist/`.

- `content/` contains Markdown, HTML, PDF, and other files to be processed
- `src/` contains the site's JavaScript code
- All files in `public/` are copied directly into `dist/`

### HTML

HTML content is inserted into the `<main>` element.

### Markdown

Markdown is converted to HTML and inserted into the `<main>` element.

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
