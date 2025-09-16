import { trigger as globalTrigger } from "../global"
import { highlightBriefly } from "../toc"

function getReferenceElements(parent: HTMLElement): HTMLElement[] {
  return Array.from(parent.querySelectorAll(".footnote-ref"))
}

function getBackreferenceElements(parent: HTMLElement): HTMLAnchorElement[] {
  return Array.from(parent.querySelectorAll(".footnote-backref"))
}

function getIdFromHref(href: string): string {
  const url = new URL(href)
  return url.hash.replace("#", "")
}

export default () => {
  const referenceElements = getReferenceElements(document.body)
  if (referenceElements == null) {
    return
  }

  referenceElements.forEach(el => {
    const a = el.querySelector("a")
    if (a == null) {
      return
    }
    const footnoteEl = document.getElementById(getIdFromHref(a.href))
    if (footnoteEl == null) {
      return
    }

    a.onclick = () => {
      highlightBriefly(footnoteEl)
    }
  })

  const backreferenceElements = getBackreferenceElements(document.body)
  backreferenceElements.forEach(el => {
    el.onclick = e => {
      const referenceEl = document.getElementById(getIdFromHref(el.href))
      if (referenceEl == null) {
        return
      }
      e.preventDefault()
      globalTrigger("pauseBackToTop")
      referenceEl.scrollIntoView()
      highlightBriefly(referenceEl)
    }
  })

  return () => {}
}
