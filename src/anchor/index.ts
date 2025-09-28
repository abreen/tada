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

    // Move all existing child nodes into the link
    while (el.firstChild) {
      link.appendChild(el.firstChild)
    }
    el.appendChild(link)

    link.addEventListener('click', () => {
      el.focus()
    })
  })

  return () => {}
}
