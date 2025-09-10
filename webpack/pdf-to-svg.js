const fs = require("fs");
const pdfjs = require("pdfjs-dist/lib/pdf");
const { BaseSVGFactory } = require("pdfjs-dist/lib/display/base_factory");
const { SVGGraphics } = require("pdfjs-dist/lib/display/svg");
const { JSDOM } = require("jsdom");

async function extractPdfPageSvgs(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));

  const dom = new JSDOM("<!DOCTYPE html>");
  global.window = dom.window;
  global.document = dom.window.document;
  global.DOMParser = dom.window.DOMParser;

  const pdfDoc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: false,
  }).promise;

  const numPages = pdfDoc.numPages;
  const svgs = [];
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const opList = await page.getOperatorList();

    const svgGfx = new FontlessSVGGraphics(page.commonObjs, page.objs);
    svgGfx.svgFactory = new JSDOMSvgFactory();

    const svg = await svgGfx.getSVG(opList, page.getViewport({ scale: 1.0 }));

    svgs.push(svg.outerHTML);
  }

  return svgs;
}

class FontlessSVGGraphics extends SVGGraphics {
  constructor(commonObjs, objs) {
    super(commonObjs, objs);
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
        .map((glyph) => {
          if (typeof glyph === "object") {
            return {...glyph, fontChar: glyph.unicode, isInFont: true};
          }
        })
        .filter((g) => g !== undefined)
    );

    // Remove x attributes added for spacing that aren't needed
    const tspans = this.current.txtElement.querySelectorAll("tspan");
    for (const tspan of tspans) {
      tspan.removeAttribute("x"); 
      tspan.removeAttribute("font-family");
    }
  }

  executeOpTree(opTree) {
    // Remove known unsupported operators before call
    super.executeOpTree(opTree.filter(
      op => op.fn !== "beginMarkedContentProps" && op.fn !== "endMarkedContent"
    ));
  }

  // Override to adjust colors to use CSS variables
  getSVG(opList, viewport) {
    return super.getSVG(opList, viewport).then((parent) => {
      const paths = parent.querySelectorAll("path");
      for (const p of paths) {
        const fill = p.getAttribute("fill").toLowerCase();
        if (fill === "#ffffff") {
          p.setAttribute("fill", "var(--bg-color, #ffffff)");
        } else if (fill === "#000000") {
          p.setAttribute("fill", "var(--fg-color, #000000)");
        }
      }

      const text = parent.querySelectorAll("text");
      for (const t of text) {
        if (t.hasAttribute("fill")) {
          continue;
        }

        const hasColoredSpans = Array.from(t.querySelectorAll("tspan")).includes((el) => el.hasAttribute("fill"));
        if (hasColoredSpans) {
          continue;
        }

        // Text is not specifically colored, so use CSS variable

        t.setAttribute("fill", "var(--fg-color, inherit)");
      }

      parent.setAttribute("width", "100%");
      parent.setAttribute("height", "auto");
      parent.setAttribute("preserveAspectRatio", "xMidYMid meet");
      return parent;
    });
  }
}

class JSDOMSvgFactory extends BaseSVGFactory {
  _createSVG(type) {
    if (type.startsWith("svg:")) {
      type = type.substring(4);
    }

    return document.createElementNS("http://www.w3.org/2000/svg", type);
  }
}

module.exports = { extractPdfPageSvgs };
