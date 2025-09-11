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

function getSearchInput(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll(".search"));
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
  const searchInputs = getSearchInput();
  if (searchInputs.length === 0) {
    return;
  }

  const thisPageTitle = document.querySelector("title")?.innerText || "";

  const state: State = { value: "", showResults: true, results: [] };
  let mini: MiniSearch | null = null;

  async function loadIndex() {
    try {
      const res = await fetch(
        window.siteVariables.basePath + "/search-index.json",
      );
      if (!res.ok) {
        console.warn("failed to fetch search index", res.statusText);
        return;
      }
      mini = MiniSearch.loadJSON(await res.text(), options);
    } catch (e) {
      // fail silently
      console.warn("failed to load search index", e);
      searchInputs.forEach((input) => {
        input.disabled = true;
      });
    }
  }

  loadIndex();

  const containers = searchInputs.map(
    (el) => el.parentElement as HTMLDivElement,
  );

  const changeHandlers: Array<(e: Event) => void> = searchInputs.map((_, i) => {
    return function handleChange(e: Event) {
      const newValue = (e.target as HTMLInputElement).value;

      if (!mini) {
        return;
      }

      let results: Result[] = [];
      if (newValue) {
        const hits = mini.search(newValue, { boost: { title: 2 } });

        results = hits.slice(0, 20).map((h) => ({
          title: subtractThisTitle(h.title || "", thisPageTitle),
          url: window.siteVariables.basePath + h.id,
          excerpt: h.excerpt || "",
          score: h.score || 0,
        }));
      }

      state.value = newValue;
      state.results = results;
      renderResults(containers[i], state.showResults, state.results);
    };
  });

  const keyUpHandlers: Array<(e: KeyboardEvent) => void> = searchInputs.map(
    (_, i) => {
      return function handleKeyUp(e: KeyboardEvent) {
        changeHandlers[i](e);
      };
    },
  );

  changeHandlers.forEach((handleChange, i) => {
    searchInputs[i].addEventListener("change", handleChange);
  });

  keyUpHandlers.forEach((handleKeyUp, i) => {
    searchInputs[i].addEventListener("keyup", handleKeyUp);
  });

  if (searchInputs.length === 1) {
    searchInputs[0].focus();
  }

  return () => {
    changeHandlers.forEach((handleChange, i) => {
      searchInputs[i].removeEventListener("change", handleChange);
    });
  };
};
