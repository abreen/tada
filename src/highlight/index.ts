import hljs from 'highlight.js/lib/core'
import plaintext from 'highlight.js/lib/languages/plaintext'
import java from 'highlight.js/lib/languages/java'
import { scheduleTask } from '../util'

export default () => {
  hljs.registerLanguage('plaintext', plaintext)
  hljs.registerAliases(['markdown'], { languageName: 'plaintext' })
  hljs.registerLanguage('java', java)
  // hljs.configure({ languages: ['plaintext', 'java'] })

  const codeBlocks = document.querySelectorAll('pre code')
  codeBlocks.forEach(el => {
    if (!el.hasAttribute('data-highlighted')) {
      scheduleTask(() => hljs.highlightElement(el as HTMLElement))
    }
  })

  return () => {}
}
