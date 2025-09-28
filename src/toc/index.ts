import { getElement, debounce } from '../util'
import { trigger as globalTrigger } from '../global'

const LATENCY_MS = 50
const MIN_PAGE_HEIGHT_PX = 1000
const MIN_HEADING_COVERAGE_PERCENT = 0.7
const RESIZE_RADIUS_PX = 10
const MIN_TOC_WIDTH_PX = 150
const MAX_TOC_WIDTH_PX = 450

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
  const container = getContainer(document.body)
  if (container == null) {
    return
  }
  const containerHasScrollbar = container.scrollHeight > container.clientHeight
  if (containerHasScrollbar) {
    element.scrollIntoView(options)
  }
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
  let lastHeadingLevel = 1
  const ol = document.createElement('ol')

  items.forEach((item, i) => {
    const li = document.createElement('li')

    function makeClickHandler(
      scrollElement: HTMLElement,
      highlightElement: HTMLElement,
      isAlert: boolean,
    ): (e: MouseEvent) => void {
      return (e: MouseEvent) => {
        globalTrigger('pauseBackToTop')
        if (isAlert) {
          e.preventDefault()
          scrollElement.scrollIntoView({ block: 'center' })
        }
        // otherwise, let browser scroll to link target
        highlightElement.focus()
      }
    }

    const handlerHeading = makeClickHandler(
      headingsAndAlerts[i],
      headingsAndAlerts[i],
      false,
    )
    const alertTitle = headingsAndAlerts[i].querySelector(
      '.title',
    ) as HTMLElement | null
    const handlerAlert = makeClickHandler(
      alertTitle || headingsAndAlerts[i],
      headingsAndAlerts[i],
      true,
    )

    if ('level' in item) {
      const heading = item as Heading
      const a = document.createElement('a')
      a.innerText = heading.text
      a.href = `#${heading.id}`
      a.onclick = handlerHeading

      rendered.push(a)

      li.className = `heading-item level${heading.level}`
      lastHeadingLevel = parseInt(heading.level)
      li.appendChild(a)
    } else {
      const alert = item as Alert
      const a = document.createElement('a')
      a.innerText = alert.title
      a.href = '#'
      a.onclick = handlerAlert

      rendered.push(a)

      li.className = `alert-item level${lastHeadingLevel + 1} ${alert.type}`
      li.appendChild(a)
    }

    ol.appendChild(li)
  })

  clearContainer(container)
  container.appendChild(ol)

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

function shouldBeActive(
  content: HTMLElement | null,
  headings: HTMLHeadingElement[] | null,
) {
  if (headings == null || headings.length < 2) {
    return false
  }

  if (content == null) {
    return false
  }

  const height = content.scrollHeight || -1
  if (height < MIN_PAGE_HEIGHT_PX) {
    return false
  }

  // Do the headings cover enough of the content?
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
  return 1 - (height - delta) / height > MIN_HEADING_COVERAGE_PERCENT
}

export default () => {
  // Guaranteed to be in order from document
  const headings = getHeadingElements(document.body)
  const toc = getElement(document.body, 'nav.toc')
  const main: HTMLElement | null = document.querySelector('main')

  if (!shouldBeActive(main, headings)) {
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

  const elements = renderTable(document.body, { items, headingsAndAlerts })

  let mouseX: number
  function resize(e: MouseEvent) {
    const dx = e.x - mouseX

    if (window.IS_DEV) {
      console.log('resize', { mouseX, dx })
    }

    if (dx === 0) {
      return
    }

    const computedStyle = getComputedStyle(toc)
    let newWidth: number = parseInt(computedStyle.width) + dx

    if (newWidth < MIN_TOC_WIDTH_PX || newWidth > MAX_TOC_WIDTH_PX) {
      toc.classList.remove('is-resizing')
      document.documentElement.style.cursor = ''
    } else {
      toc.classList.add('is-resizing')
      document.documentElement.style.cursor = 'ew-resize'

      if (main) {
        main.inert = true
      }
      toc.inert = true

      document.documentElement.style.setProperty('--toc-width', `${newWidth}px`)
    }

    mouseX = e.x
  }

  function handleMouseDown(e: MouseEvent) {
    mouseX = e.x

    const rect = toc.getBoundingClientRect()
    const diff = Math.abs(rect.x + rect.width - e.x)

    if (diff < RESIZE_RADIUS_PX) {
      resize(e)
      document.addEventListener('mousemove', resize)
    }
  }

  document.addEventListener('mousedown', handleMouseDown)

  function stopHandlingResize() {
    toc.classList.remove('is-resizing')
    document.documentElement.style.cursor = ''

    if (main) {
      main.inert = false
    }
    toc.inert = false

    document.removeEventListener('mousemove', resize)
  }

  document.addEventListener('mouseup', stopHandlingResize)

  function handleScroll() {
    const headerOffset = getHeaderOffset()

    // Find the first element not out of view & obscured by floating header
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

  // Call after load to set current item
  handleScroll()

  return () => {
    window.removeEventListener('scroll', debounced)
    document.addEventListener('mouseup', stopHandlingResize)
    document.removeEventListener('mousedown', handleMouseDown)
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
