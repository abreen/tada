import { debounce, removeClass } from '../util'
import { trigger as globalTrigger } from '../global'

const LATENCY_MS = 50
const MIN_PAGE_HEIGHT_PX = 1000
const MIN_HEADING_COVERAGE_PERCENT = 0.7
const HIGHLIGHT_DURATION_MS = 3000

type HeadingLevel = '1' | '2' | '3' | '4' | '5' | '6'
type AlertType = 'warning' | 'note'

type Alert = { type: AlertType; title: string }
type Heading = { level: HeadingLevel; text: string; id: string }

type Props = {
  items: (Heading | Alert)[]
  headingsAndAlerts: (HTMLHeadingElement | HTMLDivElement)[]
}

function clearContainer(container: HTMLElement) {
  container?.replaceChildren()
}

function getContainer(parent: HTMLElement): HTMLElement | null {
  return parent.querySelector('nav.toc')
}

function getCurrentListItem(parent: HTMLElement): HTMLLIElement | null {
  return parent.querySelector('nav.toc .current')
}

function getElementTop(element: HTMLElement): number {
  const rect = element.getBoundingClientRect()
  return rect.top - document.body.getBoundingClientRect().top
}

function scrollIfNeeded(element: HTMLElement, options?: any) {
  const parent = element.parentElement
  if (parent == null) {
    return
  }

  const parentHasScrollbar = parent.scrollHeight > parent.clientHeight
  if (parentHasScrollbar) {
    element.scrollIntoView(options)
  }
}

let highlightEl: HTMLElement | null = null
let highlightTimeout: number | null = null
export function highlightBriefly(
  element: HTMLElement,
  duration: number = HIGHLIGHT_DURATION_MS,
) {
  if (highlightEl && highlightEl != element) {
    if (highlightTimeout) {
      window.clearTimeout(highlightTimeout)
      highlightTimeout = null
    }
    removeClass(highlightEl, 'is-highlighted')
  }
  element.classList.add('is-highlighted')
  highlightEl = element
  highlightTimeout = window.setTimeout(() => {
    removeClass(element, 'is-highlighted')
    highlightTimeout = null
  }, duration)
}

function renderTable(
  parent: HTMLElement,
  { items, headingsAndAlerts }: Props,
): HTMLAnchorElement[] {
  const container = getContainer(parent)
  if (container == null) {
    throw new Error('toc container must exist already')
  }

  const rendered: HTMLAnchorElement[] = []
  let lastHeadingLevel = '1'
  const ul = document.createElement('ul')

  items.forEach((item, i) => {
    const li = document.createElement('li')

    function makeClickHandler(
      element: HTMLElement,
      preventDefault: boolean,
    ): (e: MouseEvent) => void {
      return (e: MouseEvent) => {
        globalTrigger('pauseBackToTop')
        if (preventDefault) {
          e.preventDefault()
          element.scrollIntoView()
        }
        highlightBriefly(element)
      }
    }

    const handlerNormal = makeClickHandler(headingsAndAlerts[i], false)
    const handlerPreventDefault = makeClickHandler(headingsAndAlerts[i], true)

    if ('level' in item) {
      const heading = item as Heading
      const a = document.createElement('a')
      a.innerText = heading.text
      a.href = `#${heading.id}`
      a.onclick = handlerNormal

      rendered.push(a)

      li.className = `heading-item level${heading.level}`
      lastHeadingLevel = heading.level
      li.appendChild(a)
    } else {
      const alert = item as Alert
      const a = document.createElement('a')
      a.innerText = alert.title
      a.href = '#'
      a.onclick = handlerPreventDefault

      rendered.push(a)

      li.className = `alert-item level${lastHeadingLevel} ${alert.type}`
      li.appendChild(a)
    }

    ul.appendChild(li)
  })

  clearContainer(container)
  container.appendChild(ul)

  return rendered
}

function getHeadingElements(parent: HTMLElement): HTMLHeadingElement[] {
  return Array.from(parent.querySelectorAll('h1, h2, h3, h4, h5, h6'))
}

function getHeadingsAndAlerts(
  parent: HTMLElement,
): (HTMLHeadingElement | HTMLDivElement)[] {
  return Array.from(
    parent.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, main > div.alert, main section > div.alert',
    ),
  )
}

/* Calculate how much to offset scroll calculations based on floating header */
function getHeaderOffset() {
  const element = document.querySelector('header details summary')
  if (!element) {
    return 0
  }

  return element.getBoundingClientRect().height
}

function headingToTableItem(el: HTMLHeadingElement): Heading {
  const level = el.tagName[1] as HeadingLevel
  return { level, id: el.id, text: el.innerText }
}

function alertToTableItem(el: HTMLElement): Alert | null {
  const classes = el.className
    .split(' ')
    .map(cl => cl.trim())
    .filter(cl => cl != 'alert')

  const firstClass = classes[0]
  if (firstClass === 'warning' || firstClass === 'note') {
    let title = el.querySelector('.title')?.innerHTML
    if (!title) {
      if (firstClass === 'warning') {
        title = 'Warning'
      } else {
        title = 'Note'
      }
    }

    return { type: firstClass, title }
  }

  return null
}

function shouldBeActive(headings: HTMLHeadingElement[] | null) {
  if (headings == null || headings.length < 2) {
    return false
  }

  const pageHeight = document.body.clientHeight || -1

  if (pageHeight < MIN_PAGE_HEIGHT_PX) {
    return false
  }

  // Do the headings cover enough of the page?
  let minY = Infinity,
    maxY = -Infinity
  for (const h of headings) {
    const y = getElementTop(h)
    if (y < minY) {
      minY = y
    }
    if (y > maxY) {
      maxY = y
    }
  }

  const delta = Math.abs(maxY - minY)
  return 1 - (pageHeight - delta) / pageHeight > MIN_HEADING_COVERAGE_PERCENT
}

export default () => {
  // guaranteed to be in order from document
  const headings = getHeadingElements(document.body)

  if (!shouldBeActive(headings)) {
    return
  } else {
    document.body.classList.add('toc-is-active')
  }

  const headingsAndAlerts = getHeadingsAndAlerts(document.body)
  const items = headingsAndAlerts
    .map(el => {
      if (el.tagName.toLowerCase() == 'div') {
        // element is a <div class="alert">
        return alertToTableItem(el)
      } else {
        // element is a heading
        return headingToTableItem(el)
      }
    })
    .filter(obj => obj != null)

  // keep track of the elements just rendered
  const elements = renderTable(document.body, { items, headingsAndAlerts })

  function handleScroll() {
    const headerOffset = getHeaderOffset()

    // find the first element not out of view & obscured by floating header
    let i = 0
    while (
      i < headingsAndAlerts.length &&
      getElementTop(headingsAndAlerts[i]) < window.scrollY - headerOffset
    ) {
      i++
    }

    if (i === headingsAndAlerts.length) {
      i = headingsAndAlerts.length - 1
    }
    if (i === -1) {
      i = 0
    }

    const existingItem = getCurrentListItem(document.body)
    const nextItem = elements[i]?.parentElement

    if (nextItem != null && nextItem !== existingItem) {
      switchCurrent(existingItem, nextItem)
      scrollIfNeeded(nextItem, { block: 'center' })
    }
  }
  const debounced = debounce(handleScroll, LATENCY_MS)
  window.addEventListener('scroll', debounced, { passive: true })
  window.addEventListener('load', debounced)

  return () => {
    window.removeEventListener('scroll', debounced)
    window.removeEventListener('load', debounced)
  }
}

function switchCurrent(
  oldCurrent: HTMLElement | null,
  newCurrent: HTMLElement,
) {
  if (oldCurrent) {
    oldCurrent.classList.remove('current')
  }
  newCurrent.classList.add('current')
}
