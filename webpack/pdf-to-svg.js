const fs = require('fs')
const pdfjs = require('pdfjs-dist/lib/pdf')
const { setVerbosityLevel } = require('pdfjs-dist/lib/shared/util')
const { BaseSVGFactory } = require('pdfjs-dist/lib/display/base_factory')
const { SVGGraphics } = require('pdfjs-dist/lib/display/svg')
const { JSDOM } = require('jsdom')

async function extractPdfPageSvgs(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath))

  const dom = new JSDOM('<!DOCTYPE html>')
  global.window = dom.window
  global.document = dom.window.document
  global.DOMParser = dom.window.DOMParser

  const loadedFonts = {}

  global.FontInspector = {
    enabled: true,
    fontAdded(font) {
      loadedFonts[font.loadedName] = font
    },
  }

  function fixFont(el) {
    const loadedName = el.getAttribute('font-family')
    if (loadedName === 'undefined') {
      el.removeAttribute('font-family')
      return
    }

    if (loadedFonts[loadedName]) {
      const { fontFamily, fontStyle, fontWeight } = inferFont(
        loadedFonts[loadedName].name,
      )
      el.setAttribute('font-family', fontFamily)
      if (fontStyle) {
        el.setAttribute('font-style', fontStyle)
      }
      if (fontWeight) {
        el.setAttribute('font-weight', fontWeight)
      }
    }
  }

  setVerbosityLevel(0)
  const pdfDoc = await pdfjs.getDocument({
    data,
    useSystemFonts: false,
    disableFontFace: false,
    fontExtraProperties: true,
    pdfBug: true,
  }).promise

  const numPages = pdfDoc.numPages
  const svgs = []
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const opList = await page.getOperatorList()

    const svgGfx = new FontlessSVGGraphics(page.commonObjs, page.objs)
    svgGfx.svgFactory = new JSDOMSvgFactory()

    const svg = await svgGfx.getSVG(opList, page.getViewport({ scale: 1.0 }))

    const textElements = svg.querySelectorAll('text')
    for (const text of textElements) {
      if (text.hasAttribute('font-family')) {
        fixFont(text)
      }

      const tspans = text.querySelectorAll('tspan')
      for (const tspan of tspans) {
        if (tspan.hasAttribute('font-family')) {
          fixFont(tspan)
        }
      }
    }

    svgs.push(svg.outerHTML)
  }

  return svgs
}

function inferFont(fontName) {
  if (fontName.includes('+')) {
    fontName = fontName.slice(fontName.lastIndexOf('+') + 1)
  }

  let fontStyle = null,
    fontWeight = null
  if (fontName.match(/italic/i)) {
    fontStyle = 'italic'
  } else if (fontName.match(/oblique/i)) {
    fontStyle = 'oblique'
  }

  if (fontName.match(/bold/i)) {
    fontWeight = 'bold'
  }

  let fontFamily = fontName
  if (fontName.match(/Arial ?Narrow/i)) {
    fontFamily = 'Arial Narrow, Arial, sans-serif'
  } else if (fontName.match(/Arial/i)) {
    fontFamily = 'Arial, sans-serif'
  } else if (fontName.match(/Helvetica/i)) {
    fontFamily = 'Helvetica, Arial, sans-serif'
  } else if (fontName.match(/Times ?New ?Roman/i)) {
    fontFamily = "'Times New Roman', Times, serif"
  } else if (fontName.match(/Times/i)) {
    fontFamily = 'Times, serif'
  } else if (fontName.match(/Georgia/i)) {
    fontFamily = 'Georgia, serif'
  } else if (fontName.match(/Courier ?New/i)) {
    fontFamily = "'Courier New', Courier, monospace"
  } else if (fontName.match(/Courier/i)) {
    fontFamily = 'Courier, monospace'
  } else if (fontName.match(/Lucida ?Console/i)) {
    fontFamily = "'Lucida Console', monospace"
  } else if (fontName.match(/Impact/i)) {
    fontFamily = 'Impact, sans-serif'
  } else if (fontName.match(/Verdana/i)) {
    fontFamily = 'Verdana, Geneva, sans-serif'
  } else if (fontName.match(/Tahoma/i)) {
    fontFamily = 'Tahoma, Geneva, sans-serif'
  } else if (fontName.match(/Trebuchet ?MS/i)) {
    fontFamily = "'Trebuchet MS', Helvetica, sans-serif"
  } else if (fontName.match(/Calibri/i)) {
    fontFamily = 'Calibri, Helvetica, sans-serif'
  }

  return { fontFamily, fontStyle, fontWeight }
}

class FontlessSVGGraphics extends SVGGraphics {
  constructor(commonObjs, objs) {
    super(commonObjs, objs)
  }

  /*
   * Bypass font handling completely. Only render the Unicode characters
   * from the PDF and ignore whitespace offsets.
   *
   * Much font detail is lost and some text positioning problems happen,
   * but converting everything to Unicode ensures that text is selectable
   * and searchable, and avoids issues with font loading.
   */
  showText(glyphs) {
    super.showText(
      glyphs
        .map(glyph => {
          if (typeof glyph === 'object') {
            return { ...glyph, fontChar: glyph.unicode, isInFont: true }
          }
        })
        .filter(g => g !== undefined),
    )

    // Remove x attributes added for spacing that aren't needed
    const tspans = this.current.txtElement.querySelectorAll('tspan')
    for (const tspan of tspans) {
      //tspan.removeAttribute("x");
      //tspan.removeAttribute("font-family");
    }
  }

  executeOpTree(opTree) {
    // Remove known unsupported operators before call
    super.executeOpTree(
      opTree.filter(
        op =>
          op.fn !== 'beginMarkedContentProps' && op.fn !== 'endMarkedContent',
      ),
    )
  }

  // Override to adjust colors to use CSS variables
  getSVG(opList, viewport) {
    return super.getSVG(opList, viewport).then(parent => {
      // const paths = parent.querySelectorAll("path");
      // for (const p of paths) {
      //   const fill = p.getAttribute("fill").toLowerCase();
      //   if (fill === "#ffffff") {
      //     p.setAttribute("fill", "var(--bg-color, #ffffff)");
      //   } else if (fill === "#000000") {
      //     p.setAttribute("fill", "var(--fg-color, #000000)");
      //   }
      // }

      // const text = parent.querySelectorAll("text");
      // for (const t of text) {
      //   if (t.hasAttribute("fill")) {
      //     continue;
      //   }

      //   const hasColoredSpans = Array.from(t.querySelectorAll("tspan")).includes((el) => el.hasAttribute("fill"));
      //   if (hasColoredSpans) {
      //     continue;
      //   }

      //   // Text is not specifically colored, so use CSS variable

      //   t.setAttribute("fill", "var(--fg-color, inherit)");
      // }

      parent.setAttribute('width', '100%')
      parent.removeAttribute('height')
      //parent.setAttribute("height", "auto");
      parent.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      return parent
    })
  }
}

class JSDOMSvgFactory extends BaseSVGFactory {
  _createSVG(type) {
    if (type.startsWith('svg:')) {
      type = type.substring(4)
    }

    return document.createElementNS('http://www.w3.org/2000/svg', type)
  }
}

module.exports = { extractPdfPageSvgs }
