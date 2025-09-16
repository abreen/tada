import { highlightBriefly } from "../toc"

const HIGHLIGHT_DURATION_MS = 1500

function getElements(parent: HTMLElement): HTMLHeadingElement[] {
  return Array.from(parent.querySelectorAll("h1, h2, h3, h4, h5, h6"))
}

export default () => {
  const elements = getElements(document.body)
  if (elements == null) {
    return
  }

  elements.forEach(el => {
    if (!el.id) {
      return
    }

    const link = document.createElement("a")
    link.className = "heading-anchor"
    link.href = `#${el.id}`
    link.setAttribute("aria-label", "Link to this heading")
    link.innerHTML = "#"

    link.onclick = () => {
      highlightBriefly(el, HIGHLIGHT_DURATION_MS)
    }

    el.appendChild(link)
  })

  return () => {}
}
