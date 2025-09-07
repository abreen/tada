const STEP_DURATION_MS = 3000;

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

type Index = number;
type Cell = 0 | 1;
type Grid = Cell[][];

type State = { grid: Grid; sleeping: boolean };

function renderGrid(grid: Grid, elements: HTMLHRElement[]) {
  const content = grid
    .map((row) => row.map((cell) => (cell === 0 ? "○" : "●")).join(" "))
    .join("\n");
  elements.forEach((el) => {
    el.dataset.grid = content;
  });
}

function getThematicBreakElements(parent: HTMLElement): HTMLHRElement[] {
  return Array.from(parent.querySelectorAll("hr"));
}

function neighbors(
  grid: Grid,
  x: Index,
  y: Index,
  fn: (x: Index, y: Index) => any,
) {
  return DIRECTIONS.map(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < grid.length && ny >= 0 && ny < grid[0].length) {
      return fn(nx, ny);
    }
  }).filter((value) => typeof value !== "undefined");
}

function countLiveNeighbors(grid: Grid, x: Index, y: Index) {
  return neighbors(grid, x, y, (x2, y2) => grid[x2][y2]).reduce(
    (acc, curr) => acc + curr,
  );
}

function randomPosition(grid: Grid) {
  const [x, y] = [
    Math.floor(Math.random() * grid.length),
    Math.floor(Math.random() * grid[0].length),
  ];
  return { x, y };
}

function randomDisturbance(grid: Grid) {
  for (let i = 0; i < 1; i++) {
    const { x, y } = randomPosition(grid);

    grid[x][y] = 1;
    neighbors(grid, x, y, (x2, y2) => {
      if (Math.random() > 0.3) {
        grid[x2][y2] = 1;
      }
    });
  }
}

function equals(a: Grid, b: Grid) {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[i].length; j++) {
      if (a[i][j] !== b[i][j]) {
        return false;
      }
    }
  }
  return true;
}

function inViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  return (
    rect.top <= windowHeight &&
    rect.bottom >= 0 &&
    rect.left <= windowWidth &&
    rect.right >= 0
  );
}

function anyElementsInViewport(elements: HTMLHRElement[]) {
  return elements.some(inViewport);
}

export default () => {
  const elements = getThematicBreakElements(document.body);
  if (elements == null || !elements.length) {
    return;
  }

  const state: State = {
    grid: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    sleeping: !anyElementsInViewport(elements),
  };

  function handleStep() {
    const { grid } = state;

    if (!anyElementsInViewport(elements)) {
      state.sleeping = true;
      return;
    } else {
      state.sleeping = false;
    }

    const newGrid = grid.map((arr) => arr.slice());

    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[0].length; y++) {
        const liveNeighbors = countLiveNeighbors(grid, x, y);

        if (grid[x][y] === 1) {
          // Any live cell with fewer than 2 or more than 3 live neighbors dies
          if (liveNeighbors < 2 || liveNeighbors > 3) {
            newGrid[x][y] = 0;
          }
        } else {
          // Any dead cell with exactly 3 live neighbors becomes alive
          if (liveNeighbors === 3) {
            newGrid[x][y] = 1;
          }
        }
      }
    }

    if (equals(newGrid, grid)) {
      randomDisturbance(newGrid);
    }

    renderGrid(newGrid, elements);
    state.grid = newGrid;
  }

  randomDisturbance(state.grid);
  renderGrid(state.grid, elements);
  let timeout = window.setInterval(handleStep, STEP_DURATION_MS);

  return () => {
    window.clearTimeout(timeout);
  };
};
