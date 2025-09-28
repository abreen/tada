import './style.scss'
import './pdf.scss'
import './layout.scss'
import './print.scss'
import './toc/style.scss'
import './search/style.scss'
import './header/style.scss'
import './highlight/style.scss'
import './life/style.scss'
import './top/style.scss'
import './anchor/style.scss'
import './footnotes/style.scss'

import mountTableOfContents from './toc'
import mountSearch from './search'
import mountHeader from './header'
import mountHighlight from './highlight'
import mountPrint from './print'
import mountLife from './life'
import mountTop from './top'
import mountAnchor from './anchor'
import mountFootnotes from './footnotes'

import { scheduleTask, formatDuration } from './util'

const COMPONENTS = {
  toc: mountTableOfContents,
  search: mountSearch,
  header: mountHeader,
  highlight: mountHighlight,
  print: mountPrint,
  life: mountLife,
  top: mountTop,
  anchor: mountAnchor,
  footnotes: mountFootnotes,
}

let startTime = -1

document.addEventListener('DOMContentLoaded', async () => {
  startTime = window.performance.now()

  const entries = Object.entries(COMPONENTS)

  const failed: Record<string, any> = {}

  const mountPromises = entries.map(([name, mount]) => {
    return new Promise<void>((resolve, reject) => {
      scheduleTask(async () => {
        try {
          mount()
          resolve()
          return
        } catch (err) {
          failed[name] = String(err)
        }
        reject()
      })
    })
  })

  await Promise.allSettled(mountPromises)

  for (const [name, reason] of Object.entries(failed)) {
    console.error(`Failed to mount ${name} component:`, reason)
  }

  if (window.IS_DEV) {
    const diff = window.performance.now() - startTime
    console.info(`Components mounted in ${formatDuration(diff)}`)
  }
})
