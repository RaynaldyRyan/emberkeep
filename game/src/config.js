// Emberkeep — balance constants: tower stats, enemy stats, wave table, costs.
// Every number the game tunes lives here so a balance pass touches one file.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64;          // top HUD strip height (DOM, above the canvas play area)
export const CELL = 40;           // placement grid cell size in pixels
export const GRID_COLS = 32;      // 32 * 40 = 1280
export const GRID_ROWS = 15;      // 15 * 40 = 600 play area (48px HUD + 600px canvas + 72px tower bar = 720)

export const START_GOLD = 220;
export const START_LIVES = 20;    // crystal HP
export const TOTAL_WAVES = 20;
export const SELL_REFUND = 0.7;   // fraction of total invested gold returned on sell
export const EARLY_CALL_BONUS = 12; // gold per second of countdown skipped (max 60)

// Tower definitions. range in px, rate in shots per second, damage per hit.
// upgrades: [tier1, tier2] — each adds damage/range/rate and a visual change.
export const TOWERS = {
  ember: {
    name: 'Ember',
    key: '1',
    cost: 50,
    range: 130,
    rate: 2.4,
    damage: 9,
    color: '#ff9a3c',
    dark: '#c2410c',
    desc: 'Fast shots, steady damage.',
    upgrades: [
      { cost: 45, damage: 14, range: 140, rate: 2.8 },
      { cost: 90, damage: 22, range: 155, rate: 3.2 },
    ],
  },
  frost: {
    name: 'Frost',
    key: '2',
    cost: 70,
    range: 120,
    rate: 1.1,
    damage: 5,
    slow: 0.45,        // speed multiplier applied
    slowTime: 1.6,     // seconds of slow
    color: '#7dd3fc',
    dark: '#0369a1',
    desc: 'Chills enemies, slowing them.',
    upgrades: [
      { cost: 60, damage: 8, range: 135, rate: 1.3, slow: 0.38, slowTime: 1.9 },
      { cost: 110, damage: 12, range: 150, rate: 1.5, slow: 0.32, slowTime: 2.2 },
    ],
  },
  storm: {
    name: 'Storm',
    key: '3',
    cost: 100,
    range: 150,
    rate: 0.9,
    damage: 16,
    chain: 3,          // enemies hit per shot
    color: '#c084fc',
    dark: '#7e22ce',
    desc: 'Lightning chains to 3 foes.',
    upgrades: [
      { cost: 85, damage: 24, range: 165, rate: 1.0, chain: 4 },
      { cost: 160, damage: 36, range: 185, rate: 1.15, chain: 5 },
    ],
  },
  thorn: {
    name: 'Thorn',
    key: '4',
    cost: 120,
    range: 220,
    rate: 0.55,
    damage: 42,
    color: '#86efac',
    dark: '#15803d',
    desc: 'Slow, long range, huge hits.',
    upgrades: [
      { cost: 100, damage: 68, range: 240, rate: 0.6 },
      { cost: 190, damage: 110, range: 260, rate: 0.7 },
    ],
  },
};

export const TOWER_ORDER = ['ember', 'frost', 'storm', 'thorn'];

// Enemy definitions. hp scales with wave (see waves.js). speed in px per second.
// leak: crystal HP lost when one reaches the crystal. bounty: gold on kill.
export const ENEMIES = {
  shambler: { name: 'Shambler', hp: 30, speed: 42, radius: 13, bounty: 8, leak: 1, color: '#a78bfa', shape: 'blob' },
  swift:    { name: 'Swift',    hp: 20, speed: 78, radius: 10, bounty: 9, leak: 1, color: '#f472b6', shape: 'dart' },
  bulwark:  { name: 'Bulwark',  hp: 130, speed: 26, radius: 17, bounty: 16, leak: 2, color: '#94a3b8', shape: 'shell' },
  splitter: { name: 'Splitter', hp: 55, speed: 38, radius: 14, bounty: 12, leak: 1, color: '#4ade80', shape: 'pod', splitsInto: 'mote' },
  mote:     { name: 'Mote',     hp: 12, speed: 62, radius: 7, bounty: 3, leak: 1, color: '#86efac', shape: 'dot' },
  wisp:     { name: 'Wisp',     hp: 26, speed: 58, radius: 11, bounty: 11, leak: 1, color: '#67e8f9', shape: 'wisp', weave: true },
  boss:     { name: 'Hollow King', hp: 900, speed: 20, radius: 26, bounty: 120, leak: 5, color: '#f87171', shape: 'crown' },
};

// Wave table: [shambler, swift, bulwark, splitter, wisp] counts per wave.
// Boss waves (5, 10, 15, 20) add one boss on top. HP scales +12% per wave.
export const WAVES = [
  [6, 0, 0, 0, 0],   // 1
  [8, 2, 0, 0, 0],   // 2
  [10, 4, 0, 0, 0],  // 3
  [8, 4, 2, 0, 0],   // 4
  [10, 4, 2, 0, 0],  // 5  + boss
  [10, 6, 3, 2, 0],  // 6
  [12, 8, 3, 2, 2],  // 7
  [14, 8, 4, 3, 3],  // 8
  [12, 10, 5, 4, 4], // 9
  [14, 10, 5, 4, 4], // 10 + boss
  [16, 12, 6, 5, 5], // 11
  [16, 14, 7, 6, 6], // 12
  [18, 14, 8, 6, 7], // 13
  [18, 16, 9, 7, 8], // 14
  [20, 16, 9, 8, 8], // 15 + boss
  [20, 18, 10, 9, 9],// 16
  [22, 20, 11, 10, 10], // 17
  [24, 20, 12, 10, 11], // 18
  [24, 22, 13, 11, 12], // 19
  [26, 24, 14, 12, 12], // 20 + boss
];

export const WAVE_HP_SCALE = 0.12;   // +12% enemy HP per wave
export const WAVE_BOUNTY_BONUS = 25; // gold for clearing a wave, +2 per wave
export const SPAWN_GAP = 0.85;       // seconds between spawns in a wave
export const BOSS_HP_SCALE = 1.35;   // boss HP multiplier per boss wave (5->10->15->20)

export const CRYSTAL = { x: 1180, y: 320, radius: 34 };
export const PATH_COLOR = '#2d1f3d';
export const GROUND_A = '#171226';
export const GROUND_B = '#1b1530';
