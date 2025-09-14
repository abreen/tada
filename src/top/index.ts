import { debounce, removeClass } from "../util";
import {
  on as globalOn,
  remove as globalRemove,
  get as globalGet,
} from "../global";

/** Show the "Back to top" button after scrolling up this many pixels */
//const SHOW_THRESHOLD_PX = 300;
const SHOW_THRESHOLD_PERCENT = 0.33;

/** Hide the "Back to top" button after scrolling down this many pixels */
const HIDE_THRESHOLD_PX = 80;

/** Don't do anything at the top of the page */
const HIDE_ZONE_PX = 900;

/** When "pauseBackToTop" event is triggered, don't show the button for this long */
const PAUSE_DURATION_MS = 3000;

/** Debounce time (maximum amount of time to wait before updates) */
const LATENCY_MS = 50;

function createButton(parent: HTMLElement): HTMLButtonElement {
  const div = document.createElement("div");
  div.className = "back-to-top";

  const button = document.createElement("button");
  button.innerText = "Back to top";
  div.appendChild(button);

  parent.appendChild(div);

  return button;
}

export default () => {
  const button = createButton(document.body);

  let isShowing = false,
    lastScrollY = 0,
    isScrollingUp = -1,
    isScrollingDown = -1;

  button.onclick = () => {
    window.scroll({ top: 0 });
    isScrollingUp = isScrollingDown = -1;
    lastScrollY = 0;
  };

  function show(button: HTMLButtonElement) {
    if (!isShowing) {
      button.classList.add("is-hovering");
    }
    isShowing = true;
  }

  function hide(button: HTMLButtonElement) {
    if (isShowing) {
      removeClass(button, "is-hovering");
    }
    isShowing = false;
  }

  function handleScroll() {
    if (button == null) {
      return;
    }

    if (window.scrollY < HIDE_ZONE_PX) {
      lastScrollY = window.scrollY;
      hide(button);
      return;
    }

    const diff = lastScrollY - window.scrollY;

    if (diff == 0) {
      return;
    } else if (diff < 0) {
      // Scrolled down
      const diffPos = Math.abs(diff);

      if (isScrollingUp !== -1) {
        // Was previously scrolling up
        isScrollingUp = -1;
        isScrollingDown = diffPos;
      } else {
        // Continuing to scroll down
        isScrollingDown += diffPos;
      }

      // Is the total amount scrolled down enough to hide the button?
      if (isScrollingDown > HIDE_THRESHOLD_PX) {
        hide(button);
      }
    } else {
      // Scrolled up

      if (isScrollingDown !== -1) {
        // Was previously scrolling down
        isScrollingDown = -1;
        isScrollingUp = diff;
      } else {
        // Continuing to scroll up
        isScrollingUp += diff;
      }

      const scrolledUpEnough =
        isScrollingUp / window.innerHeight > SHOW_THRESHOLD_PERCENT;
      if (!pause && globalGet("headerIsOpen") !== true && scrolledUpEnough) {
        show(button);
      }
    }

    lastScrollY = window.scrollY;
  }

  const debounced = debounce(handleScroll, LATENCY_MS);
  document.addEventListener("scroll", debounced, { passive: true });

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
    document.removeEventListener("scroll", debounced);
  };
};
