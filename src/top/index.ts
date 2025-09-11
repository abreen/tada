import { removeClass } from "../util";
import { on as globalOn, remove as globalRemove } from "../global";

const PAUSE_DURATION_MS = 3000;
const TOP_HEIGHT_PX = 120;
const THRESHOLD_PX = 300;
const HIDE_THRESHOLD_PX = 80;

function createButton(parent: HTMLElement): HTMLButtonElement {
  const div = document.createElement("div");
  div.className = "back-to-top";

  const button = document.createElement("button");
  button.innerText = "Back to top";
  div.appendChild(button);

  parent.appendChild(div);

  return button;
}

function show(button: HTMLButtonElement) {
  button.classList.add("is-hovering");
}

function hide(button: HTMLButtonElement) {
  removeClass(button, "is-hovering");
}

export default () => {
  const button = createButton(document.body);

  let lastScrollY = 0,
    isScrollingUp = -1,
    isScrollingDown = -1;

  button.onclick = () => {
    window.scroll({ top: 0 });
    isScrollingUp = -1;
  };

  //let isWarmingUp = true;
  //setTimeout(() => {
  //  isWarmingUp = false;
  //}, 1000);

  function handleScroll() {
    if (button == null) {
      return;
    }

    if (window.scrollY < TOP_HEIGHT_PX) {
      hide(button);
      return;
    }

    //if (isWarmingUp) {
    //  return;
    //}

    const diff = lastScrollY - window.scrollY;

    if (diff > 0) {
      if (isScrollingUp === -1) {
        isScrollingUp = window.scrollY;
        isScrollingDown = -1;
      }

      const diffFromUp = isScrollingUp - window.scrollY;
      if (diffFromUp > THRESHOLD_PX) {
        if (!pause) {
          show(button);
        }
      }
    }

    if (diff < 0) {
      if (isScrollingDown === -1) {
        isScrollingUp = -1;
        isScrollingDown = window.scrollY;
      }

      const diffFromDown = window.scrollY - isScrollingDown;
      if (diffFromDown > HIDE_THRESHOLD_PX) {
        hide(button);
      }
    }

    lastScrollY = window.scrollY;
  }
  document.addEventListener("scroll", handleScroll, { passive: true });

  let timeout: number | null = null,
    pause = false;

  /*
   * Prevent "Back to top" from showing when other components are about to
   * scroll the page up (e.g., the footnotes component).
   */
  function handlePause() {
    if (button != null) {
      hide(button);
    }

    pause = true;

    if (timeout != null) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => {
      pause = false;
    }, PAUSE_DURATION_MS);
  }
  globalOn("pauseBackToTop", handlePause);

  return () => {
    globalRemove("pauseBackToTop", handlePause);
    document.removeEventListener("scroll", handleScroll);
  };
};
