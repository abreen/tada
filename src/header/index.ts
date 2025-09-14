import { removeClass } from "../util";
import { on as globalOn, set as globalSet } from "../global";

const DURATION_MS = 250;

// CSS properties we control via the style attribute
const CONTROLLED_PROPERTIES = ["height", "overflow"];

function removeStyle(el: HTMLElement, propertyName: string) {
  el.style.removeProperty(propertyName);
  if (
    CONTROLLED_PROPERTIES.every(
      (property) => !el.style.getPropertyValue(property),
    )
  ) {
    el.removeAttribute("style");
  }
}

function getExpandedHeight(summary: HTMLElement, content: HTMLElement) {
  function elementHeight(el: HTMLElement) {
    const style = window.getComputedStyle(el);
    return (
      el.offsetHeight +
      parseFloat(style.marginTop) +
      parseFloat(style.marginBottom)
    );
  }

  let totalHeight = elementHeight(summary);

  for (const child of content.children) {
    totalHeight += elementHeight(child as HTMLElement);
  }

  return Math.ceil(totalHeight);
}

function getElement(parent: Document | Element, selector: string): HTMLElement {
  const el = parent.querySelector(selector);
  if (!el) {
    throw new Error(`no element matching "${selector}"`);
  }
  return el as HTMLElement;
}

export default () => {
  const header: HTMLElement = getElement(document, "header");
  const details = getElement(header, "details") as HTMLDetailsElement;
  const summary: HTMLElement = getElement(details, "summary");
  const content: HTMLElement = getElement(details, ".content");

  let isExpanding = false,
    isCollapsing = false,
    animation: Animation | null;

  function finish(isOpen: boolean) {
    details.open = isOpen;
    if (isOpen) {
      header.classList.add("is-open");
    } else {
      removeClass(header, "is-open");
    }
    removeClass(header, "is-expanding");
    removeClass(header, "is-collapsing");
    removeStyle(details, "height");
    removeStyle(details, "overflow");
    isExpanding = false;
    isCollapsing = false;
    animation = null;

    globalSet("headerIsOpen", isOpen);
  }

  function collapse() {
    details.style.overflow = "hidden";
    if (isCollapsing || isExpanding) {
      animation?.cancel();
    }

    isCollapsing = true;
    header.classList.add("is-collapsing");

    animation = details.animate(
      { height: [`${details.offsetHeight}px`, `${summary.offsetHeight}px`] },
      { duration: DURATION_MS, easing: "ease" },
    );

    animation.onfinish = () => finish(false);
    animation.oncancel = () => {
      isCollapsing = false;
      removeClass(header, "is-collapsing");
    };
  }

  function expand() {
    details.style.overflow = "hidden";
    if (isCollapsing || isExpanding) {
      animation?.cancel();
    }

    isExpanding = true;
    header.classList.add("is-expanding");

    details.style.height = `${details.offsetHeight}px`;
    details.open = true;

    const expandedHeight = getExpandedHeight(summary, content);

    animation = details.animate(
      { height: [`${details.offsetHeight}px`, `${expandedHeight}px`] },
      { duration: DURATION_MS, easing: "ease" },
    );

    animation.onfinish = () => finish(true);
    animation.oncancel = () => {
      isExpanding = false;
      removeClass(header, "is-expanding");
    };
  }

  function handleClick(e: MouseEvent) {
    if (!(e?.target instanceof HTMLElement)) {
      return;
    }

    // User clicked search results, not the <details> element
    if (e.target.closest(".search-container") != null) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (header.classList.contains("is-frozen")) {
      return;
    }

    if (isCollapsing || !details.open) {
      expand();
    } else if (isExpanding || details.open) {
      collapse();
    }
  }
  summary.addEventListener("click", handleClick);

  function handleDetailsClick(e: MouseEvent) {
    e.stopPropagation();
  }
  details.addEventListener("click", handleDetailsClick);

  function handleWindowClick() {
    if (header.classList.contains("is-frozen")) {
      return;
    }

    if (details.open && !isCollapsing) {
      collapse();
    }
  }
  window.addEventListener("click", handleWindowClick);

  function handleKeyDown(e: KeyboardEvent) {
    if (header.classList.contains("is-frozen")) {
      return;
    }

    if (e.key === "Escape" && details.open && !isCollapsing) {
      collapse();
    }
  }
  window.addEventListener("keydown", handleKeyDown);

  globalOn("searchShortcutInvoked", () => {
    if (!details.open && !isExpanding) {
      expand();
    }
  });

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("click", handleWindowClick);
    details.removeEventListener("click", handleDetailsClick);
    summary.removeEventListener("click", handleClick);
  };
};
