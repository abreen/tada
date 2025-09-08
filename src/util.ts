export function debounce(fn: Function, time: number) {
  let timer: number;
  return (...args: any[]) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn.apply(null, args);
    }, time);
  };
}

export function removeClass(el: HTMLElement, className: string) {
  el.classList.remove(className);
  if (!el.className) {
    el.removeAttribute("class");
  }
}
