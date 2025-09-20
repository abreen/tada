import { highlightBriefly } from '../toc'

function getElements(parent: HTMLElement): HTMLHeadingElement[] {
  return Array.from(parent.querySelectorAll('h1, h2, h3, h4, h5, h6'))
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

    const link = document.createElement('a')
    link.className = 'heading-anchor'
    link.href = `#${el.id}`
    link.title = 'Link to this heading'
    link.setAttribute('aria-label', 'Link to this heading')
    link.innerHTML = LINK_ICON_SVG

    link.onclick = () => {
      highlightBriefly(el)
    }

    el.appendChild(link)
  })

  return () => {}
}

const LINK_ICON_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M10.975 14.51a1.05 1.05 0 0 0 0-1.485 2.95 2.95 0 0 1 0-4.172l3.536-3.535a2.95 2.95 0 1 1 4.172 4.172l-1.093 1.092a1.05 1.05 0 0 0 1.485 1.485l1.093-1.092a5.05 5.05 0 0 0-7.142-7.142L9.49 7.368a5.05 5.05 0 0 0 0 7.142c.41.41 1.075.41 1.485 0zm2.05-5.02a1.05 1.05 0 0 0 0 1.485 2.95 2.95 0 0 1 0 4.172l-3.5 3.5a2.95 2.95 0 1 1-4.171-4.172l1.025-1.025a1.05 1.05 0 0 0-1.485-1.485L3.87 12.99a5.05 5.05 0 0 0 7.142 7.142l3.5-3.5a5.05 5.05 0 0 0 0-7.142 1.05 1.05 0 0 0-1.485 0z"/></svg>'
