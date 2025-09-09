type Key = "pauseBackToTop";
type Event = "pauseBackToTop";

export const INITIAL_STATE = {
  pauseBackToTop: false,
};

let state: Record<Key, any> = INITIAL_STATE;

const listeners: Record<Event, Function[]> = {
  pauseBackToTop: [],
};

export function set(key: Key, value: any) {
  state[key] = value;
}

export function get(key: Key): any {
  return state[key];
}

export function unset(key: Key) {
  return (state[key] = INITIAL_STATE[key]);
}

export function unsetAll() {
  for (const key of Object.keys(INITIAL_STATE)) {
    unset(key as Key);
  }
}

export function on(event: Event, fn: Function) {
  listeners[event].push(fn);
}

export function remove(event: Event, fn: Function) {
  for (let i = 0; i < listeners[event].length; i++) {
    if (listeners[event][i] === fn) {
      listeners[event].splice(i, 1);
      return;
    }
  }
}

export function trigger(event: Event) {
  listeners[event].forEach((fn) => fn());
}
