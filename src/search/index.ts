import MiniSearch from "minisearch";
import options from "./options.json";
import { applyBasePath } from "../util";

const PLACEHOLDER_DISCLAIMER = " (requires JavaScript)";
const QUICK_SEARCH_MAX_RESULTS = 4;
const SEARCH_MAX_RESULTS = 12;

type Result = { title: string; url: string; excerpt: string; score: number };

type State = { value: string; showResults: boolean; results: Result[] };

function renderResults(
  parent: HTMLElement,
  showResults: boolean,
  results: Result[],
) {
  const resultsContainer = parent.querySelector(".results");
  if (!resultsContainer) {
    throw new Error("results element must already be in the DOM");
  }

  if (!showResults) {
    resultsContainer.classList.add("is-hidden");
  } else {
    resultsContainer.classList.remove("is-hidden");
  }

  const existingList = resultsContainer.querySelector("ol");
  const existingSpan = resultsContainer.querySelector("span");

  existingSpan?.remove();

  if (results.length === 0) {
    existingList?.remove();
    const span = document.createElement("span");
    span.innerText = "No results";
    span.className = "no-results";
    resultsContainer.appendChild(span);
    return;
  }

  const ol = document.createElement("ol");

  results.forEach((result) => {
    const a = document.createElement("a");
    a.className = "result";
    a.href = result.url;

    const title = document.createElement("div");
    title.className = "title";
    title.innerText = result.title;
    a.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.className = "subtitle";
    subtitle.innerText = result.url;
    a.appendChild(subtitle);

    const score = document.createElement("div");
    score.className = "score";
    score.innerText = result.score.toFixed(2);
    a.appendChild(score);

    const excerpt = document.createElement("div");
    excerpt.className = "excerpt";
    excerpt.innerHTML = result.excerpt;
    a.appendChild(excerpt);

    const li = document.createElement("li");
    li.appendChild(a);
    ol.appendChild(li);
  });

  if (existingList) {
    existingList.replaceWith(ol);
  } else {
    resultsContainer.appendChild(ol);
  }
}

function getSearchInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll("input.search"));
}

export default () => {
  const searchInputs = getSearchInputs();
  if (searchInputs.length === 0) {
    return;
  }

  searchInputs.forEach((input) => {
    const placeholder = input.placeholder;
    if (placeholder && placeholder.endsWith(PLACEHOLDER_DISCLAIMER)) {
      input.placeholder = placeholder.substring(
        0,
        placeholder.length - PLACEHOLDER_DISCLAIMER.length,
      );
    }
  });

  const onSearchPage = window.location.pathname.endsWith("/search.html");

  const state: State = { value: "", showResults: true, results: [] };
  let mini: MiniSearch | null = null;

  async function loadIndex() {
    try {
      const res = await fetch(applyBasePath("/search-index.json"));
      if (!res.ok) {
        console.warn("failed to fetch search index", res.statusText);
        return;
      }
      mini = MiniSearch.loadJSON(await res.text(), options);
    } catch (e) {
      console.warn("failed to load search index", e);
      searchInputs.forEach((input) => {
        input.disabled = true;
      });
    }
  }

  loadIndex().then(() => {
    searchInputs.forEach((input) => {
      if (input.value) {
        const event = new Event("change");
        input.dispatchEvent(event);
      }
    });
  });

  const containers = searchInputs.map(
    (el) => el.parentElement?.parentElement as HTMLDivElement,
  );

  for (const c of containers) {
    if (!c.classList.contains("search-container")) {
      throw new Error("invalid search container");
    }
  }

  const changeHandlers: Array<(e: Event) => void> = searchInputs.map((_, i) => {
    return function handleChange(e: Event) {
      if (!mini) {
        return;
      }

      if (!(e.target instanceof HTMLInputElement)) {
        return;
      }

      const newValue = e.target.value;
      if (newValue === state.value) {
        return;
      }

      if (!newValue) {
        state.value = "";
        state.showResults = false;
        state.results = [];
        renderResults(containers[i], state.showResults, state.results);
        return;
      }

      let results: Result[] = [];
      const maxNumResults = e.target?.classList.contains("quick-search")
        ? QUICK_SEARCH_MAX_RESULTS
        : SEARCH_MAX_RESULTS;

      const hits = mini.search(newValue, { prefix: true });

      results = hits
        .slice(0, maxNumResults)
        .map((h) => ({
          title: h.title,
          url: h.id,
          excerpt: h.excerpt,
          score: h.score,
        }))
        .filter((r) => r !== undefined);

      state.value = newValue;
      state.showResults = true;
      state.results = results;
      renderResults(containers[i], state.showResults, state.results);
    };
  });

  const keyUpHandlers: Array<(e: KeyboardEvent) => void> = searchInputs.map(
    (_, i) => {
      return function handleKeyUp(e: KeyboardEvent) {
        if (e.key === "Enter" && !onSearchPage) {
          e.preventDefault();
          window.location.href = applyBasePath(
            "/search.html#q=" + encodeURIComponent(state.value),
          );
        } else {
          changeHandlers[i](e);
        }
      };
    },
  );

  const focusHandlers: Array<(e: FocusEvent) => void> = searchInputs.map(
    (input, i) => {
      return function handleFocus() {
        if (input.classList.contains("nav") && state.results.length > 0) {
          state.showResults = true;
          renderResults(containers[i], state.showResults, state.results);
        }
      };
    },
  );

  const searchHandlers: Array<(e: Event) => void> = searchInputs.map((_, i) => {
    return function handleSearch(e: Event) {
      changeHandlers[i](e);
    };
  });

  changeHandlers.forEach((handleChange, i) => {
    searchInputs[i].addEventListener("change", handleChange);
  });

  keyUpHandlers.forEach((handleKeyUp, i) => {
    searchInputs[i].addEventListener("keyup", handleKeyUp);
  });

  focusHandlers.forEach((handleFocus, i) => {
    searchInputs[i].addEventListener("focus", handleFocus);
  });

  searchHandlers.forEach((handleSearch, i) => {
    searchInputs[i].addEventListener("search", handleSearch);
  });

  return () => {
    searchHandlers.forEach((handleSearch, i) => {
      searchInputs[i].removeEventListener("search", handleSearch);
    });

    focusHandlers.forEach((handleFocus, i) => {
      searchInputs[i].removeEventListener("focus", handleFocus);
    });

    keyUpHandlers.forEach((handleKeyUp, i) => {
      searchInputs[i].removeEventListener("keyup", handleKeyUp);
    });

    changeHandlers.forEach((handleChange, i) => {
      searchInputs[i].removeEventListener("change", handleChange);
    });
  };
};
