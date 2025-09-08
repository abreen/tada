import { removeClass } from "../util";

const TOP_HEIGHT_PX = 64;
const THRESHOLD_PX = 300;
const HIDE_THRESHOLD_PX = 80;

function getBackToTopButton(parent: HTMLElement): HTMLButtonElement | null {
  return parent.querySelector(".back-to-top button");
}

function show(button: HTMLButtonElement) {
  button.classList.add("is-hovering");
}

function hide(button: HTMLButtonElement) {
  removeClass(button, "is-hovering");
}

export default () => {
  const button = getBackToTopButton(document.body);
  if (button == null) {
    throw new Error("back to top button must exist already");
  }

  let lastScrollY = window.scrollY,
    isScrollingUp = -1,
    isScrollingDown = -1;

  button.onclick = () => {
    window.scroll({ top: 0 });
    isScrollingUp = -1;
  };

  function handleScroll() {
    if (button == null) {
      return;
    }

    if (window.scrollY < TOP_HEIGHT_PX) {
      hide(button);
      return;
    }

    const diff = lastScrollY - window.scrollY;

    if (diff > 0) {
      if (isScrollingUp === -1) {
        isScrollingUp = window.scrollY;
        isScrollingDown = -1;
      }

      const diffFromUp = isScrollingUp - window.scrollY;
      if (diffFromUp > THRESHOLD_PX) {
        show(button);
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

  document.addEventListener("scroll", handleScroll);

  return () => {
    document.removeEventListener("scroll", handleScroll);
  };
};
