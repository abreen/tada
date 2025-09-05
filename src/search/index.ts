type Result = { title: string; subtitle: string; excerpt: string };

type State = { value: string; showResults: boolean; results: Result[] };

function renderResults(
  parent: HTMLElement,
  showResults: boolean,
  results: Result[],
) {
  const existing = parent.querySelector("#results");
  if (existing) {
    parent.removeChild(existing);
  }

  if (!results.length || !showResults) {
    return;
  }

  const ol = document.createElement("ol");

  results.forEach((result) => {
    const a = document.createElement("a");
    a.className = "result";

    const title = document.createElement("p");
    title.className = "title";
    title.innerText = result.title;
    a.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.className = "subtitle";
    subtitle.innerText = result.subtitle;
    a.appendChild(subtitle);

    const excerpt = document.createElement("p");
    excerpt.className = "excerpt";
    excerpt.innerHTML = `&#133;${result.excerpt}&#133;`;
    a.appendChild(excerpt);

    const li = document.createElement("li");
    li.appendChild(a);
    ol.appendChild(li);
  });

  const div = document.createElement("div");
  div.id = "results";
  div.appendChild(ol);
  parent.appendChild(div);
}

function getElements(): [HTMLInputElement, HTMLElement] {
  const el = document.getElementById("search") as HTMLInputElement;
  if (!el) {
    throw new Error("no search element");
  }

  const parent = el.parentElement;
  if (!parent) {
    throw new Error("no parent element");
  }

  return [el, parent];
}

export default () => {
  const [search, container] = getElements();

  let state: State = { value: "", showResults: false, results: [] };

  function updateState(newState: State) {
    if (newState !== state) {
      state = { ...state, ...newState };
      renderResults(container, state.showResults, state.results);
    }
  }

  function handleFocus() {
    updateState({ ...state, showResults: true });
  }
  search.addEventListener("focus", handleFocus);

  function handleBlur() {
    updateState({ ...state, showResults: false });
  }
  search.addEventListener("blur", handleBlur);

  function handleInput(e: Event) {
    const newValue = (e.target as HTMLInputElement).value || "";
    updateState({ ...state, value: newValue });

    // TODO
    if (!newValue) {
      updateState({ ...state, results: [] });
    } else {
      updateState({
        ...state,
        results: [
          {
            title: "Problem Set 5",
            subtitle: "Problem 3",
            excerpt:
              'the following keys into a <span class="highlight">binary search tree</span>, showing the',
          },
          {
            title: "Problem Set 2",
            subtitle: "Problem 6",
            excerpt:
              'form the keys of a <span class="highlight">binary search tree</span>, what would the',
          },
          {
            title: "Lecture 3",
            subtitle: "Coursepack page 59",
            excerpt:
              'in a <span class="highlight">binary search tree</span> the keys are kept in order such that',
          },
        ],
      });
    }
  }
  search.addEventListener("input", handleInput);

  search.placeholder = "Search";
  search.disabled = false;

  return () => {
    search.removeEventListener("input", handleInput);
    search.removeEventListener("blur", handleBlur);
    search.removeEventListener("focus", handleFocus);
  };
};
