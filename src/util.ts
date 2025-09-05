export function debounce(fn: Function, time: number) {
  let timer: number;
  return (...args: any[]) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn.apply(null, args);
    }, time);
  };
}
