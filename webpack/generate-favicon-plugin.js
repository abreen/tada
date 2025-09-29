const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const toIco = require('to-ico')
const { makeLogger } = require('./log')

const log = makeLogger(__filename)

function extractInnerSvgAndViewBox(svgBuf) {
  const raw = String(svgBuf)
    .replace(/<\?xml[\s\S]*?\?>/gi, '') // remove XML declaration if present
    .trim()

  const openMatch = raw.match(/<svg\b[^>]*>/i)
  if (!openMatch) {
    return { inner: raw, viewBox: '0 0 100 100' }
  }
  const openTag = openMatch[0]
  const inner = raw
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
  const vbMatch = openTag.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)
  const viewBox = vbMatch ? vbMatch[1] : '0 0 100 100'
  return { inner, viewBox }
}

function buildGlyphGroup(glyphBuf, cellX, cellY, cellW, cellH) {
  const { inner, viewBox } = extractInnerSvgAndViewBox(glyphBuf)
  const parts = String(viewBox).trim().split(/\s+/).map(Number)
  const [minX, minY, vbW, vbH] =
    parts.length === 4 && parts.every(n => Number.isFinite(n))
      ? parts
      : [0, 0, 100, 100]

  const scale = Math.min(cellW / vbW, cellH / vbH)
  const tx = cellX + (cellW - vbW * scale) / 2 - minX * scale
  const ty = cellY + (cellH - vbH * scale) / 2 - minY * scale

  return `<g transform="translate(${tx} ${ty}) scale(${scale})"><g fill="#fff">${inner}</g></g>`
}

function createFaviconSvg(size, color, symbol) {
  if (size < 10) {
    throw new Error()
  }

  if (!symbol || symbol.length > 4) {
    throw new Error()
  }

  const n = symbol.length
  const pad = size * 0.15
  const kerning = Math.max(1, size * 0.02)
  const contentW = Math.max(0, size - pad * 2)
  const glyphCellW = contentW / n
  const glyphW = Math.max(0, glyphCellW - kerning)
  const glyphH = size * 0.72
  const y = (size - glyphH) / 2

  let glyphs = ''
  for (let i = 0; i < n; i++) {
    const ch = symbol[i]
    const buf = font[ch]
    if (!buf) {
      throw new Error(`Unsupported glyph '${ch}'`)
    }
    const x = pad + i * glyphCellW + kerning / 2
    glyphs += buildGlyphGroup(buf, x, y, glyphW, glyphH)
  }

  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size / 10}" fill="${color}" />
  ${glyphs}
</svg>`
}

class GenerateFaviconPlugin {
  constructor(siteVariables, options = {}) {
    this.options = {
      sizes: options.sizes || [16, 32, 48, 64, 128, 256],
      svgSize: options.svgSize || 512,
      filenameBase: options.filenameBase || 'favicon',
      color: siteVariables.faviconColor,
      symbol: siteVariables.faviconSymbol,
    }
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap('GenerateFaviconPlugin', compilation => {
      const wp = compilation.compiler.webpack || {}
      const { RawSource } =
        (wp.sources && wp.sources) || require('webpack-sources')

      const distDir =
        compiler.options &&
        compiler.options.output &&
        compiler.options.output.path
          ? compiler.options.output.path
          : compiler.outputPath || compilation.compiler.outputPath

      compilation.hooks.processAssets.tapPromise(
        {
          name: 'GenerateFaviconPlugin',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async assets => {
          const { color, symbol, sizes, filenameBase, svgSize } = this.options

          if (!color || !symbol) {
            throw new Error('Missing required "color" and/or "symbol" options')
          }

          try {
            const svgMarkup = createFaviconSvg(svgSize, color, symbol)
            compilation.emitAsset(
              `${filenameBase}.svg`,
              new RawSource(svgMarkup),
            )

            const pngBuffers = await Promise.all(
              sizes.map(async size => {
                const svgForSize = createFaviconSvg(size, color, symbol)
                // Use Sharp to generate PNG, get buffer
                const buf = await sharp(Buffer.from(svgForSize))
                  .png()
                  .toBuffer()

                // Write bytes into PNG file
                compilation.emitAsset(
                  `${filenameBase}-${size}.png`,
                  new RawSource(buf),
                )
                return { size, buf }
              }),
            )

            // Convert and save .ico file versions
            const icoBuffer = await toIco(
              pngBuffers.sort((a, b) => a.size - b.size).map(x => x.buf),
            )
            compilation.emitAsset(
              `${filenameBase}.ico`,
              new RawSource(icoBuffer),
            )
          } catch (err) {
            compilation.errors.push(
              new Error(`Error: ${err && err.message ? err.message : err}`),
            )
          }
        },
      )
    })
  }
}

module.exports = GenerateFaviconPlugin

const font = {
  A: fs.readFileSync(path.resolve(__dirname, './letters/a.svg')),
  B: fs.readFileSync(path.resolve(__dirname, './letters/b.svg')),
  C: fs.readFileSync(path.resolve(__dirname, './letters/c.svg')),
  D: fs.readFileSync(path.resolve(__dirname, './letters/d.svg')),
  E: fs.readFileSync(path.resolve(__dirname, './letters/e.svg')),
  F: fs.readFileSync(path.resolve(__dirname, './letters/f.svg')),
  G: fs.readFileSync(path.resolve(__dirname, './letters/g.svg')),
  H: fs.readFileSync(path.resolve(__dirname, './letters/h.svg')),
  I: fs.readFileSync(path.resolve(__dirname, './letters/i.svg')),
  J: fs.readFileSync(path.resolve(__dirname, './letters/j.svg')),
  K: fs.readFileSync(path.resolve(__dirname, './letters/k.svg')),
  L: fs.readFileSync(path.resolve(__dirname, './letters/l.svg')),
  M: fs.readFileSync(path.resolve(__dirname, './letters/m.svg')),
  N: fs.readFileSync(path.resolve(__dirname, './letters/n.svg')),
  O: fs.readFileSync(path.resolve(__dirname, './letters/o.svg')),
  P: fs.readFileSync(path.resolve(__dirname, './letters/p.svg')),
  Q: fs.readFileSync(path.resolve(__dirname, './letters/q.svg')),
  R: fs.readFileSync(path.resolve(__dirname, './letters/r.svg')),
  S: fs.readFileSync(path.resolve(__dirname, './letters/s.svg')),
  T: fs.readFileSync(path.resolve(__dirname, './letters/t.svg')),
  U: fs.readFileSync(path.resolve(__dirname, './letters/u.svg')),
  V: fs.readFileSync(path.resolve(__dirname, './letters/v.svg')),
  W: fs.readFileSync(path.resolve(__dirname, './letters/w.svg')),
  X: fs.readFileSync(path.resolve(__dirname, './letters/x.svg')),
  Y: fs.readFileSync(path.resolve(__dirname, './letters/y.svg')),
  Z: fs.readFileSync(path.resolve(__dirname, './letters/z.svg')),
  0: fs.readFileSync(path.resolve(__dirname, './letters/0.svg')),
  1: fs.readFileSync(path.resolve(__dirname, './letters/1.svg')),
  2: fs.readFileSync(path.resolve(__dirname, './letters/2.svg')),
  3: fs.readFileSync(path.resolve(__dirname, './letters/3.svg')),
  4: fs.readFileSync(path.resolve(__dirname, './letters/4.svg')),
  5: fs.readFileSync(path.resolve(__dirname, './letters/5.svg')),
  6: fs.readFileSync(path.resolve(__dirname, './letters/6.svg')),
  7: fs.readFileSync(path.resolve(__dirname, './letters/7.svg')),
  8: fs.readFileSync(path.resolve(__dirname, './letters/8.svg')),
  9: fs.readFileSync(path.resolve(__dirname, './letters/9.svg')),
  '-': fs.readFileSync(path.resolve(__dirname, './letters/dash.svg')),
}
