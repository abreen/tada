import { trigger as globalTrigger } from '../global'

function getReferenceElements(parent: HTMLElement): HTMLAnchorElement[] {
  return Array.from(parent.querySelectorAll('.footnote-ref'))
}

function getBackreferenceElements(parent: HTMLElement): HTMLAnchorElement[] {
  return Array.from(parent.querySelectorAll('.footnote-backref'))
}

function getIdFromHref(href: string): string {
  const url = new URL(href)
  return url.hash.replace('#', '')
}

export default () => {
  const referenceElements = getReferenceElements(document.body)
  if (referenceElements == null) {
    return
  }

  referenceElements.forEach(el => {
    const footnoteEl = document.getElementById(getIdFromHref(el.href))
    if (footnoteEl == null) {
      return
    }

    el.onclick = () => {
      footnoteEl.focus();
    }
  })

  const backreferenceElements = getBackreferenceElements(document.body)
  backreferenceElements.forEach(el => {
    el.onclick = e => {
      const referenceEl = document.getElementById(getIdFromHref(el.href))
      if (referenceEl == null) {
        return
      }
      e.stopPropagation()
      globalTrigger('pauseBackToTop')
      referenceEl.focus()
    }
  })

  return () => {}
}
