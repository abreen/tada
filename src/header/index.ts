import { removeClass } from '../util'
import { on as globalOn, set as globalSet } from '../global'

const DURATION_MS = 250

// CSS properties we control via the style attribute
const CONTROLLED_PROPERTIES = ['height', 'overflow']

function removeStyle(el: HTMLElement, propertyName: string) {
  el.style.removeProperty(propertyName)
  if (
    CONTROLLED_PROPERTIES.every(
      property => !el.style.getPropertyValue(property),
    )
  ) {
    el.removeAttribute('style')
  }
}

function getExpandedHeight(summary: HTMLElement, content: HTMLElement) {
  function elementHeight(el: HTMLElement) {
    const style = window.getComputedStyle(el)
    return (
      el.offsetHeight +
      parseFloat(style.marginTop) +
      parseFloat(style.marginBottom)
    )
  }

  let totalHeight = elementHeight(summary)

  for (const child of Array.from(content.children)) {
    totalHeight += elementHeight(child as HTMLElement)
  }

  return Math.ceil(totalHeight)
}

function getElement(parent: Document | Element, selector: string): HTMLElement {
  const el = parent.querySelector(selector)
  if (!el) {
    throw new Error(`no element matching "${selector}"`)
  }
  return el as HTMLElement
}

export default () => {
  const header: HTMLElement = getElement(document, 'header')
  const details = getElement(header, 'details') as HTMLDetailsElement
  const summary: HTMLElement = getElement(details, 'summary')
  const content: HTMLElement = getElement(details, '.content')

  let main: HTMLElement | null
  try {
    main = getElement(document, 'main')
  } catch {
    // ignored
  }

  let isExpanding = false,
    isCollapsing = false,
    animation: Animation | null

  function finish(isOpen: boolean) {
    details.open = isOpen
    if (main) {
      main.inert = isOpen
    }
    if (isOpen) {
      header.classList.add('is-open')
    } else {
      removeClass(header, 'is-open')
    }
    removeClass(header, 'is-expanding')
    removeClass(header, 'is-collapsing')
    removeStyle(details, 'height')
    removeStyle(details, 'overflow')
    isExpanding = false
    isCollapsing = false
    animation = null

    globalSet('headerIsOpen', isOpen)
  }

  function collapse() {
    details.style.overflow = 'hidden'
    if (isCollapsing || isExpanding) {
      animation?.cancel()
    }

    isCollapsing = true
    header.classList.add('is-collapsing')

    animation = details.animate(
      { height: [`${details.offsetHeight}px`, `${summary.offsetHeight}px`] },
      { duration: DURATION_MS, easing: 'ease' },
    )

    animation.onfinish = () => finish(false)
    animation.oncancel = () => {
      isCollapsing = false
      removeClass(header, 'is-collapsing')
    }
  }

  function expand() {
    details.style.overflow = 'hidden'
    if (isCollapsing || isExpanding) {
      animation?.cancel()
    }

    isExpanding = true
    header.classList.add('is-expanding')

    details.style.height = `${details.offsetHeight}px`
    details.open = true
    if (main) {
      main.inert = true
    }

    const expandedHeight = getExpandedHeight(summary, content)

    animation = details.animate(
      { height: [`${details.offsetHeight}px`, `${expandedHeight}px`] },
      { duration: DURATION_MS, easing: 'ease' },
    )

    animation.onfinish = () => finish(true)
    animation.oncancel = () => {
      isExpanding = false
      removeClass(header, 'is-expanding')
    }
  }

  function handleSummaryClick(e: MouseEvent) {
    if (window.IS_DEV) {
      console.log('header summary clicked')
    }

    if (header.classList.contains('is-frozen')) {
      e.preventDefault()
      return
    }

    if (isCollapsing || !details.open) {
      expand()
      e.preventDefault()
      e.stopPropagation()
    } else if (isExpanding || details.open) {
      collapse()
      e.preventDefault()
      e.stopPropagation()
    }
  }
  summary.addEventListener('click', handleSummaryClick)

  function handleDetailsClick(e: MouseEvent) {
    if (window.IS_DEV) {
      console.log('header details clicked')
    }

    if (details.open && !isCollapsing) {
      e.stopPropagation()
    }
  }
  details.addEventListener('click', handleDetailsClick)

  function handleWindowClick() {
    if (window.IS_DEV) {
      console.log('window click in header')
    }

    if (header.classList.contains('is-frozen')) {
      return
    }

    if (details.open && !isCollapsing) {
      collapse()
    }
  }
  window.addEventListener('click', handleWindowClick)

  function handleWindowKeyDown(e: KeyboardEvent) {
    if (header.classList.contains('is-frozen')) {
      return
    }

    if (e.key === 'Escape' && details.open && !isCollapsing) {
      collapse()
    }
  }
  window.addEventListener('keydown', handleWindowKeyDown)

  globalOn('searchShortcutInvoked', () => {
    if (!details.open && !isExpanding) {
      expand()
    }
  })

  return () => {
    window.removeEventListener('keydown', handleWindowKeyDown)
    window.removeEventListener('click', handleWindowClick)
    details.removeEventListener('click', handleDetailsClick)
    summary.removeEventListener('click', handleSummaryClick)
  }
}
