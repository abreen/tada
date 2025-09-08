type Key = "tableOfContentsClicked";

const state: Record<Key, any> = {
  tableOfContentsClicked: false,
};

export function set(key: Key, value: any) {
  state[key] = value;
}

export function get(key: Key): any {
  return state[key];
}
