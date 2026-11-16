// Emberkeep — the world: map, winding path, crystal, placement grid.
// The path snakes from the west gate to the ember crystal in the east.
// Towers may be placed on any grid cell that is not on the path, not on the
// crystal, and not already occupied.

import { CELL, GRID_COLS, GRID_ROWS, CRYSTAL } from './config.js';

// Path waypoints in grid cells (column, row), converted to pixel centers.
export const PATH_CELLS = [
  [0, 2], [5, 2], [5, 7], [10, 7], [10, 12], [15, 12], [15, 5], [20, 5],
  [20, 10], [25, 10], [25, 3], [29, 3], [29, 8],
];

export function cellToPx(c, r) {
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}

// The full path as pixel waypoints, ending at the crystal.
export function buildPath() {
  const pts = PATH_CELLS.map(([c, r]) => cellToPx(c, r));
  pts.push({ x: CRYSTAL.x, y: CRYSTAL.y });
  return pts;
}

// Set of "col,row" keys the path covers, so placement can reject them.
export function buildPathCells() {
  const set = new Set();
  for (let i = 0; i < PATH_CELLS.length - 1; i++) {
    const [c0, r0] = PATH_CELLS[i];
    const [c1, r1] = PATH_CELLS[i + 1];
    const dc = Math.sign(c1 - c0);
    const dr = Math.sign(r1 - r0);
    let c = c0;
    let r = r0;
    set.add(`${c},${r}`);
    while (c !== c1 || r !== r1) {
      c += dc;
      r += dr;
      set.add(`${c},${r}`);
    }
  }
  return set;
}

// Crystal footprint in grid cells (2x2 around the crystal center).
export function crystalCells() {
  const set = new Set();
  const cc = Math.floor(CRYSTAL.x / CELL);
  const cr = Math.floor(CRYSTAL.y / CELL);
  for (let dc = -1; dc <= 0; dc++) {
    for (let dr = -1; dr <= 0; dr++) {
      set.add(`${cc + dc},${cr + dr}`);
    }
  }
  return set;
}

export function inBounds(c, r) {
  return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
}

// A cell is buildable when it is in bounds, off the path, off the crystal,
// and free of towers.
export function canBuildAt(state, c, r) {
  if (!inBounds(c, r)) return false;
  if (state.pathCells.has(`${c},${r}`)) return false;
  if (state.crystalCells.has(`${c},${r}`)) return false;
  if (state.towers.some((t) => t.col === c && t.row === r)) return false;
  return true;
}

// Walk along the path by distance: returns {x, y, angle, done}.
// dist is measured in pixels from the path start.
export function pointAtDistance(path, dist) {
  let remaining = dist;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (remaining <= len) {
      const t = len === 0 ? 0 : remaining / len;
      return {
        x: a.x + dx * t,
        y: a.y + dy * t,
        angle: Math.atan2(dy, dx),
        done: false,
      };
    }
    remaining -= len;
  }
  const last = path[path.length - 1];
  return { x: last.x, y: last.y, angle: 0, done: true };
}

export function pathLength(path) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
  }
  return total;
}
