// Emberkeep — deterministic shot scenes for screenshots.
// ?shot=<scene>&seed=<n> builds a fixed scene with a seeded RNG and a fixed
// simulated time, then sets window.__shotReady = true once drawn.
// Scenes: title, play, victory, defeat.

import { makeRng } from './random.js';
import { makeTower } from './towers.js';
import { makeEnemy } from './enemies.js';
import { pointAtDistance } from './world.js';
import { spawnBurst } from './particles.js';

export function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  return { scene: shot, seed: Number(q.get('seed') || 1) };
}

// Build the requested scene into a fresh state. Returns true when a scene
// was built (the caller then draws one frame and sets __shotReady).
export function setupShot(state, scene, seed) {
  const rng = makeRng(seed);
  state.rng = rng;
  if (scene === 'title') {
    state.phase = 'title';
    state.gold = 220;
    state.wave = 0;
    // A few decorative towers + enemies wandering for a lively backdrop.
    placeShowcaseTowers(state);
    seedWanderingEnemies(state, 6, rng);
    return true;
  }
  if (scene === 'play') {
    state.phase = 'playing';
    state.wave = 8;
    state.waveActive = true;
    state.gold = 342;
    state.lives = 17;
    state.score = 4860;
    state.stats.kills = 87;
    state.stats.shotsFired = 412;
    state.stats.shotsHit = 388;
    placeShowcaseTowers(state);
    seedBattleEnemies(state, rng);
    // Simulate ~2.5 seconds of combat so projectiles, particles and
    // lightning are in flight for the shot.
    state.simulate(2.5);
    state.banner = 'WAVE 8';
    state.bannerUntil = state.time + 1.5;
    return true;
  }
  if (scene === 'victory') {
    state.phase = 'victory';
    state.wave = 20;
    state.gold = 512;
    state.lives = 9;
    state.score = 28450;
    state.best = 28450;
    state.stats.kills = 342;
    state.stats.shotsFired = 1840;
    state.stats.shotsHit = 1692;
    state.stats.built = 18;
    placeShowcaseTowers(state);
    spawnBurst(state.particles, 400, 200, '#fbbf24', 40, 180);
    spawnBurst(state.particles, 880, 240, '#c084fc', 40, 180);
    spawnBurst(state.particles, 640, 160, '#7dd3fc', 30, 160);
    return true;
  }
  if (scene === 'defeat') {
    state.phase = 'defeat';
    state.wave = 13;
    state.gold = 96;
    state.lives = 0;
    state.score = 11230;
    state.best = 15200;
    state.stats.kills = 198;
    state.stats.shotsFired = 1020;
    state.stats.shotsHit = 901;
    state.stats.built = 11;
    placeShowcaseTowers(state);
    seedWanderingEnemies(state, 10, rng);
    spawnBurst(state.particles, 1180, 320, '#ef4444', 30, 150);
    return true;
  }
  return false;
}

// A handsome defensive line: one of each tower type, mixed tiers.
function placeShowcaseTowers(state) {
  const layout = [
    ['ember', 3, 4, 1], ['frost', 7, 5, 0], ['storm', 8, 9, 2], ['thorn', 12, 10, 1],
    ['ember', 13, 14, 0], ['frost', 17, 7, 1], ['storm', 18, 12, 0], ['thorn', 22, 8, 2],
    ['ember', 23, 12, 1], ['frost', 26, 5, 0], ['ember', 27, 11, 0], ['storm', 16, 3, 1],
  ];
  for (const [type, col, row, tier] of layout) {
    const t = makeTower(type, col, row);
    t.tier = tier;
    t.angle = -Math.PI / 2 + (col % 3) * 0.5;
    state.towers.push(t);
  }
}

// Enemies spread along the path for a busy battlefield.
function seedBattleEnemies(state, rng) {
  const types = ['shambler', 'shambler', 'swift', 'bulwark', 'splitter', 'wisp', 'shambler', 'swift'];
  const total = state.pathTotal;
  for (let i = 0; i < 16; i++) {
    const type = types[i % types.length];
    const e = makeEnemy(type, 8, state.path, 1);
    e.dist = total * (0.08 + (i / 16) * 0.75) + rng() * 30;
    placeOnPath(e, state.path);
    state.enemies.push(e);
  }
  // One boss mid-path for drama.
  const boss = makeEnemy('boss', 8, state.path, 1);
  boss.dist = total * 0.45;
  placeOnPath(boss, state.path);
  state.enemies.push(boss);
}

function seedWanderingEnemies(state, count, rng) {
  const types = ['shambler', 'swift', 'wisp', 'splitter'];
  const total = state.pathTotal;
  for (let i = 0; i < count; i++) {
    const e = makeEnemy(types[i % types.length], 1, state.path, 1);
    e.dist = total * (0.1 + (i / count) * 0.7) + rng() * 20;
    placeOnPath(e, state.path);
    state.enemies.push(e);
  }
}

// Put an enemy at its path distance (used by shot scenes, which do not run
// the movement step before the first draw).
function placeOnPath(e, path) {
  const p = pointAtDistance(path, e.dist);
  e.x = p.x;
  e.y = p.y;
}
