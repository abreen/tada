import MiniSearch from "minisearch";
import options from "./options.json";

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

  if (results.length === 0) {
    existingList?.remove();
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

function getSearchInput(): HTMLInputElement {
  return document.querySelector(".search.big") as HTMLInputElement;
}

function subtractThisTitle(title: string, thisTitle: string) {
  // Starting from the end, remove matching chars until they differ
  let i = title.length - 1;
  let j = thisTitle.length - 1;

  while (i >= 0 && j >= 0) {
    if (title[i] !== thisTitle[j]) {
      break;
    }
    i--;
    j--;
  }

  return title.substring(0, i + 1).trim();
}

export default () => {
  const search = getSearchInput();
  const container = search?.parentElement as HTMLDivElement;
  if (search == null || container == null) {
    return;
  }

  const thisPageTitle = document.querySelector("title")?.innerText || "";

  let state: State = { value: "", showResults: true, results: [] };
  let mini: MiniSearch | null = null;

  async function loadIndex() {
    try {
      const res = await fetch("/search-index.json");
      if (!res.ok) {
        console.warn("failed to fetch search index", res.statusText);
        return;
      }
      mini = MiniSearch.loadJSON(await res.text(), options);
    } catch (e) {
      // fail silently
      console.warn("failed to load search index", e);
    }
  }

  loadIndex().then(() => {
    search.placeholder = "Search";
    search.disabled = false;
  });

  function updateState(newState: State) {
    if (newState !== state) {
      state = { ...state, ...newState };
      renderResults(container, state.showResults, state.results);
    }
  }

  function handleFocus() {
    // updateState({ ...state, showResults: true });
  }
  search.addEventListener("focus", handleFocus);

  function handleBlur() {
    // updateState({ ...state, showResults: false });
  }
  search.addEventListener("blur", handleBlur);

  function handleChange(e: Event) {
    const newValue = (e.target as HTMLInputElement).value;

    if (!mini) {
      return;
    }

    let results: Result[] = [];
    if (newValue) {
      const hits = mini.search(newValue, { boost: { title: 2 } });

      results = hits.slice(0, 20).map((h) => ({
        title: subtractThisTitle(h.title || "", thisPageTitle),
        url: h.id || "",
        excerpt: h.excerpt || "",
        score: h.score || 0,
      }));
    }

    updateState({ ...state, value: newValue, results });
  }
  search.addEventListener("change", handleChange);

  function handleKeyUp(e: KeyboardEvent) {
    handleChange(e);
  }
  search.addEventListener("keyup", handleKeyUp);

  search.focus();

  return () => {
    search.removeEventListener("keyup", handleKeyUp);
    search.removeEventListener("change", handleChange);
    search.removeEventListener("blur", handleBlur);
    search.removeEventListener("focus", handleFocus);
  };
};
