import hljs from 'highlight.js/lib/core'
import java from 'highlight.js/lib/languages/java'
hljs.registerLanguage('java', java)

export default () => {
  const codeBlocks = document.querySelectorAll('pre code')
  codeBlocks.forEach(el => {
    if (!el.hasAttribute('data-highlighted')) {
      hljs.highlightElement(el as HTMLElement)
    }
  })

  return () => {}
}
