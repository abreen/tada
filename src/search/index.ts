import MiniSearch from 'minisearch'
import options from './options.json'
import { applyBasePath } from '../util'
import { trigger as globalTrigger } from '../global'

const PLACEHOLDER_DISCLAIMER = ' (requires JavaScript)'
const QUICK_SEARCH_MAX_RESULTS = 4
const SEARCH_MAX_RESULTS = 24
const ACTIVE_RESULT_PREFETCH_DELAY_MS = 350

let mini: MiniSearch | null = null

type Result = { title: string; url: string; excerpt: string; score: number }

type State = {
  value: string
  showResults: boolean
  maxNumResults: number
  results: Result[]
  currentTopResult: Result | null
  // -1 means no active selection
  activeIndex: number
}

function update(container: HTMLElement, isQuickSearch: boolean, state: State) {
  if (mini == null) {
    return
  }

  if (!state.value) {
    state.results = []
    state.currentTopResult = null
    state.activeIndex = -1
    highlightTopResultHint(container, false)
    renderResults(
      container,
      state.results,
      state.showResults,
      state.maxNumResults,
      state.currentTopResult,
      state.value,
      state.activeIndex,
    )
    return
  }

  const hits = mini.search(state.value, { prefix: true })

  const results: Result[] = hits
    .map(h => ({
      title: h.title,
      url: h.id,
      excerpt: h.excerpt,
      score: h.score,
    }))
    .filter(r => r !== undefined)

  const firstResultIsTopResult =
    results.length === 1 ||
    (results.length > 0 &&
      results[0].score >
        2 *
          results
            .slice(1)
            .map(({ score }) => score)
            .reduce((acc, val) => acc + val))

  if (firstResultIsTopResult) {
    state.currentTopResult = results[0]
    updatePrefetch(results[0].url)
  } else {
    state.currentTopResult = null
  }

  state.maxNumResults = isQuickSearch
    ? QUICK_SEARCH_MAX_RESULTS
    : SEARCH_MAX_RESULTS

  state.results = results

  renderResults(
    container,
    state.results,
    state.showResults,
    state.maxNumResults,
    state.currentTopResult,
    state.value,
    state.activeIndex,
  )
}

function renderInfo(
  parent: HTMLElement,
  numResults: number,
  maxNumResults: number,
  value: string,
) {
  let span = parent.querySelector('.results-info') as HTMLSpanElement | null
  if (!span) {
    span = document.createElement('span')
    span.className = 'results-info'
    parent.insertBefore(span, parent.firstChild)
  }

  if (numResults === 0) {
    span.innerText = 'No results'
  } else if (numResults <= maxNumResults) {
    if (numResults === 1) {
      span.innerText = 'One result'
    } else {
      span.innerText = `${numResults} results`
    }
  } else if (numResults > maxNumResults) {
    span.innerText = `Showing first ${maxNumResults} results • `

    const a = document.createElement('a')
    a.href = applyBasePath('/search.html#q=' + encodeURIComponent(value))
    a.innerText = `See all ${numResults} results`
    span.appendChild(a)
  }
}

function renderResults(
  parent: HTMLElement,
  results: Result[],
  showResults: boolean,
  maxNumResults: number,
  currentTopResult: Result | null,
  value: string,
  activeIndex: number,
) {
  const resultsContainer = parent.querySelector(
    '.results-container',
  ) as HTMLElement
  if (!resultsContainer) {
    throw new Error('results element must already be in the DOM')
  }

  const ol = document.createElement('ol')

  results.slice(0, maxNumResults).forEach((result, i) => {
    const isTopResult = result == currentTopResult
    const isActive = i === activeIndex

    const a = document.createElement('a')
    a.className = `result${isTopResult ? ' top-result' : ''}${
      isActive ? ' is-active' : ''
    }`
    a.href = result.url
    if (activeIndex < 0) {
      a.tabIndex = 0
    } else if (isActive) {
      a.tabIndex = 0
      a.setAttribute('aria-current', 'true')
    } else {
      a.tabIndex = -1
    }

    const titleEl = document.createElement('div')
    titleEl.className = 'title'

    let badges = '',
      title = String(result.title)
    const matches = result.title.match(/(\d+) of (\d+)/)

    if (matches) {
      badges += `<span class="badge page-number">page ${matches[1]}</span>`
      if (matches.index) {
        title = title.slice(0, matches.index - 2)
      }
    }
    if (isTopResult) {
      badges += '<span class="badge top-result">Top&nbsp;result</span>'
    }

    titleEl.innerHTML = `${title}${badges}`
    a.appendChild(titleEl)

    const subtitle = document.createElement('div')
    subtitle.className = 'subtitle'
    subtitle.innerText = result.url
    a.appendChild(subtitle)

    const excerpt = document.createElement('div')
    excerpt.className = 'excerpt'
    excerpt.innerHTML = result.excerpt
    a.appendChild(excerpt)

    const li = document.createElement('li')
    li.appendChild(a)
    ol.appendChild(li)
  })

  if (!showResults) {
    resultsContainer.classList.add('is-hidden')
    resultsContainer.setAttribute('aria-hidden', 'true')
  }

  let div = resultsContainer.querySelector('.results') as HTMLElement | null
  if (div) {
    div.replaceChildren(ol)
  } else {
    div = document.createElement('div')
    div.className = 'results'
    div.appendChild(ol)
  }

  renderInfo(div, results.length, maxNumResults, value)

  if (showResults) {
    resultsContainer.setAttribute('aria-hidden', 'false')
    resultsContainer.classList.remove('is-hidden')
  }

  highlightTopResultHint(parent, currentTopResult != null && activeIndex === -1)
}

function highlightTopResultHint(parent: HTMLElement, highlight: boolean) {
  const topResultHint = parent.querySelector('.hints .top-result-hint')
  if (topResultHint) {
    if (highlight) {
      topResultHint.classList.add('is-highlighted')
    } else {
      topResultHint.classList.remove('is-highlighted')
    }
  }
}

function getSearchInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll('input.search'))
}

function isQuickSearch(el: HTMLInputElement | null) {
  if (!el) {
    return false
  }
  return el.classList.contains('quick-search')
}

function isMainSearch(el: HTMLInputElement | null) {
  if (!el) {
    return false
  }
  return el.classList.contains('main-search')
}

function activateSearchInputs(inputs: HTMLInputElement[]) {
  inputs.forEach(el => {
    const placeholder = el.placeholder
    if (placeholder && placeholder.endsWith(PLACEHOLDER_DISCLAIMER)) {
      el.placeholder = placeholder.substring(
        0,
        placeholder.length - PLACEHOLDER_DISCLAIMER.length,
      )
    }
  })
}

function dispatchInputEvents(inputs: HTMLInputElement[]) {
  inputs.forEach(el => {
    if (el.value) {
      const event = new Event('input')
      el.dispatchEvent(event)
    }
  })
}

export default () => {
  const searchInputs = getSearchInputs()
  if (searchInputs.length === 0) {
    return
  }

  async function loadIndex() {
    try {
      const res = await fetch(applyBasePath('/search-index.json'))
      if (!res.ok) {
        console.warn('failed to fetch search index', res.statusText)
        return
      }
      mini = MiniSearch.loadJSON(await res.text(), options)
    } catch (e) {
      console.warn('failed to load search index', e)
      searchInputs.forEach(input => {
        input.disabled = true
      })
    }
  }

  loadIndex().then(() => dispatchInputEvents(searchInputs))

  activateSearchInputs(searchInputs)

  const onSearchPage = window.location.pathname.endsWith('/search.html')

  const state: State = {
    value: '',
    showResults: onSearchPage ? true : false,
    maxNumResults: -1,
    results: [],
    currentTopResult: null,
    activeIndex: -1,
  }

  const containers = searchInputs.map(
    el => el.parentElement?.parentElement as HTMLDivElement,
  )

  const inputHandlers: Array<(e: Event) => void> = searchInputs.map((_, i) => {
    return function handleInput(e: Event) {
      if (window.IS_DEV) {
        console.log('input', e)
      }

      state.value = (e.target as HTMLInputElement).value
      // Reset active selection on input change
      state.activeIndex = -1
      update(containers[i], isQuickSearch(searchInputs[i]), state)
    }
  })

  const keyDownHandlers: Array<(e: KeyboardEvent) => void> = searchInputs.map(
    (_, i) => {
      return function handleKeyDown(e: KeyboardEvent) {
        if (window.IS_DEV) {
          console.log('keydown', e)
        }

        if (!state.showResults) {
          return
        }

        if (e.key === 'Enter') {
          // Prefer navigating to the active selection if present
          const hasActive =
            state.activeIndex >= 0 && state.activeIndex < state.results.length
          if (hasActive) {
            const selected = state.results[state.activeIndex]
            if (selected) {
              window.location.href = selected.url
              return
            }
          }
          if (state.currentTopResult) {
            window.location.href = state.currentTopResult.url
            return
          } else if (!onSearchPage) {
            window.location.href = applyBasePath(
              '/search.html#q=' + encodeURIComponent(state.value),
            )
            return
          }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          if (window.IS_DEV) {
            console.log('searchbox arrow up/down')
          }
          e.preventDefault()
          e.stopPropagation()

          const total = state.results.length
          const visibleCount =
            state.maxNumResults < 0
              ? total
              : Math.min(total, state.maxNumResults)
          if (visibleCount === 0) {
            return
          }

          const currentIndex = state.activeIndex
          let nextIndex = 0
          if (e.key === 'ArrowUp') {
            if (currentIndex === -1) {
              nextIndex = visibleCount - 1
            } else if (currentIndex === 0) {
              // Stay on the first result
              nextIndex = 0
            } else {
              nextIndex = currentIndex - 1
            }
          } else if (e.key === 'ArrowDown') {
            if (currentIndex === -1) {
              // Initialize to 0 on first ArrowDown
              nextIndex = 0
            } else if (currentIndex === visibleCount - 1) {
              // Stay on the last result
              nextIndex = visibleCount - 1
            } else {
              nextIndex = currentIndex + 1
            }
          }

          state.activeIndex = nextIndex

          function prefetchActive(index: number) {
            if (state.activeIndex < 0) {
              return
            }

            const active = state.results[state.activeIndex]
            if (active) {
              updatePrefetch(active.url)
            }
          }

          // After a short delay, prefetch the currently active selection
          setTimeout(prefetchActive, ACTIVE_RESULT_PREFETCH_DELAY_MS)

          // Re-render to reflect the active selection without re-running the search
          renderResults(
            containers[i],
            state.results,
            state.showResults,
            state.maxNumResults,
            state.currentTopResult,
            state.value,
            state.activeIndex,
          )
        }
      }
    },
  )

  const focusHandlers: Array<(e: Event) => void> = searchInputs.map((_, i) => {
    return function handleFocus() {
      if (window.IS_DEV) {
        console.log('focus')
      }

      state.showResults = true
      update(containers[i], isQuickSearch(searchInputs[i]), state)
    }
  })

  const clickHandlers: Array<(e: MouseEvent) => void> = searchInputs.map(_ => {
    return function handleClick(e: MouseEvent) {
      if (window.IS_DEV) {
        console.log('search input click', e)
      }

      // Prevent this click from closing the header <details> element
      e.stopPropagation()
    }
  })

  inputHandlers.forEach((handleInput, i) => {
    searchInputs[i].addEventListener('input', handleInput)
  })

  keyDownHandlers.forEach((handleKeyDown, i) => {
    searchInputs[i].addEventListener('keydown', handleKeyDown)
  })

  focusHandlers.forEach((handleFocus, i) => {
    searchInputs[i].addEventListener('focus', handleFocus)
  })

  clickHandlers.forEach((handleClick, i) => {
    searchInputs[i].addEventListener('click', handleClick)
  })

  function handleWindowKeyDown(e: KeyboardEvent) {
    if (window.IS_DEV) {
      console.log('window keydown', e)
    }

    if (e.key === 'Escape') {
      state.value = ''
      state.showResults = false
      state.activeIndex = -1
      containers.forEach((container, i) => {
        searchInputs[i].blur()
        update(container, isQuickSearch(searchInputs[i]), state)
      })
      return
    }

    if (e.code === 'Space' && e.ctrlKey) {
      if (document.activeElement instanceof HTMLInputElement) {
        // Already focused on an input
        return
      }

      let inputToFocus: HTMLInputElement | undefined
      if (onSearchPage) {
        inputToFocus = searchInputs.find(isMainSearch)
      } else {
        inputToFocus = searchInputs.find(isQuickSearch)
      }

      if (inputToFocus) {
        e.preventDefault()
        if (!onSearchPage) {
          globalTrigger('searchShortcutInvoked')
        }
        inputToFocus.focus()
      }
    }
  }

  window.addEventListener('keydown', handleWindowKeyDown)

  function handleWindowClick(e: MouseEvent) {
    if (window.IS_DEV) {
      console.log('window click', e)
    }

    state.showResults = false
    state.activeIndex = -1
    containers.forEach((container, i) => {
      update(container, isQuickSearch(searchInputs[i]), state)
      highlightTopResultHint(container, false)
    })
  }

  window.addEventListener('click', handleWindowClick)

  return () => {
    window.removeEventListener('click', handleWindowClick)

    window.removeEventListener('keydown', handleWindowKeyDown)

    clickHandlers.forEach((handleClick, i) => {
      searchInputs[i].removeEventListener('click', handleClick)
    })

    focusHandlers.forEach((handleFocus, i) => {
      searchInputs[i].removeEventListener('focus', handleFocus)
    })

    keyDownHandlers.forEach((handleKeyDown, i) => {
      searchInputs[i].removeEventListener('keydown', handleKeyDown)
    })

    inputHandlers.forEach((handleInput, i) => {
      searchInputs[i].removeEventListener('input', handleInput)
    })
  }
}

function updatePrefetch(href: string | null) {
  try {
    const existing = document.head.querySelector(
      'link[data-prefetch]',
    ) as HTMLLinkElement | null

    if (!href) {
      if (existing) {
        existing.remove()
      }
      return
    }

    if (existing) {
      if (existing.href === href) {
        return
      }
      existing.remove()
    }

    const link = document.createElement('link')
    link.setAttribute('rel', 'prefetch')
    link.setAttribute('as', 'document')
    link.setAttribute('href', href)
    link.setAttribute('data-prefetch', '1')
    document.head.appendChild(link)
  } catch (ignored) {}
}
