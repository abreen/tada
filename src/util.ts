export function debounce(fn: Function, time: number) {
  let timer: number
  return (...args: any[]) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      fn.apply(null, args)
    }, time)
  }
}

export function removeClass(el: HTMLElement, className: string) {
  el.classList.remove(className)
  if (!el.className) {
    el.removeAttribute('class')
  }
}

export function getElement(
  parent: Document | Element,
  selector: string,
): HTMLElement {
  const el = parent.querySelector(selector)
  if (!el) {
    throw new Error(`no element matching "${selector}"`)
  }
  return el as HTMLElement
}

export function applyBasePath(subPath: string): string {
  if (!subPath.startsWith('/')) {
    throw new Error('invalid internal path, must start with "/": ' + subPath)
  }

  let path = window.siteVariables.basePath || '/'
  if (path.endsWith('/')) {
    path = path.slice(0, -1)
  }
  return path + subPath
}
