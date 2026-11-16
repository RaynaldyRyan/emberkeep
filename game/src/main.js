// Emberkeep — game loop, state machine (title / playing / paused / victory /
// defeat) and DOM sync. Fixed 60 Hz simulation step, decoupled from render.

import { VIEW_W, VIEW_H, START_GOLD, START_LIVES, TOTAL_WAVES, TOWERS, TOWER_ORDER, CELL, GRID_ROWS } from './config.js';
import { makeRng } from './random.js';
import { buildPath, buildPathCells, crystalCells, pathLength } from './world.js';
import { makeParticles, updateParticles } from './particles.js';
import { makeAudio, toggleMute, sfxVictory, sfxDefeat, sfxLeak, sfxCoin } from './audio.js';
import { moveEnemy } from './enemies.js';
import { updateTowers, updateProjectiles, sellValue, upgradeTower, upgradeCost, towerStats } from './towers.js';
import { startWave, updateSpawning, waveCleared, completeWave, enemiesRemaining, callEarly } from './waves.js';
import { drawWorld } from './render.js';
import { bindInput } from './input.js';
import { readShotParams, setupShot } from './shots.js';

const STEP = 1 / 60;
const BEST_KEY = 'emberkeep-best-score';

function freshState() {
  const path = buildPath();
  return {
    phase: 'title',
    time: 0,
    gold: START_GOLD,
    lives: START_LIVES,
    maxLives: START_LIVES,
    score: 0,
    wave: 0,
    waveActive: false,
    roster: [],
    spawned: 0,
    spawnTimer: 0,
    betweenTimer: 0,
    banner: '',
    bannerUntil: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    lightning: [],
    goldFloat: [],
    particles: makeParticles(),
    audio: makeAudio(),
    rng: makeRng((Date.now() % 2147483647) || 1),
    path,
    pathTotal: pathLength(path),
    pathCells: buildPathCells(),
    crystalCells: crystalCells(),
    placeType: null,
    selected: null,
    hoverCell: null,
    hoverValid: false,
    stats: { kills: 0, shotsFired: 0, shotsHit: 0, built: 0 },
    best: Number(localStorage.getItem(BEST_KEY) || 0),
    simulate: null, // filled below (shot scenes run the sim without rAF)
  };
}

let state = freshState();
let canvas;
let ctx;
let acc = 0;
let lastTs = 0;
let shotMode = null;

function step(dt) {
  state.time += dt;
  if (state.phase !== 'playing') {
    updateParticles(state.particles, dt);
    return;
  }
  // Wave countdown between waves.
  if (!state.waveActive && state.wave < TOTAL_WAVES && state.wave > 0) {
    state.betweenTimer -= dt;
    if (state.betweenTimer <= 0) startWave(state);
  }
  updateSpawning(state, dt);
  updateTowers(state, dt);
  updateProjectiles(state, dt);
  // Move enemies; leaks damage the crystal.
  for (const e of state.enemies) {
    if (e.dead || e.reached) continue;
    if (moveEnemy(e, state.path, state.pathTotal, dt, state.time) === 'reached') {
      state.lives -= e.leak;
      state.particles.shake = Math.max(state.particles.shake, 8);
      sfxLeak(state.audio);
      if (state.lives <= 0) {
        state.lives = 0;
        endGame(false);
        return;
      }
    }
  }
  // Sweep dead/reached enemies.
  if (state.enemies.length > 0) {
    state.enemies = state.enemies.filter((e) => !e.dead && !e.reached);
  }
  // Lightning fades.
  for (const L of state.lightning) L.life -= dt;
  state.lightning = state.lightning.filter((L) => L.life > 0);
  // Gold floats fade.
  for (const g of state.goldFloat) {
    g.life -= dt;
    g.y -= 20 * dt;
  }
  state.goldFloat = state.goldFloat.filter((g) => g.life > 0);
  updateParticles(state.particles, dt);
  if (waveCleared(state)) completeWave(state);
  if (state.phase === 'victory') endGame(true);
}

function endGame(won) {
  state.phase = won ? 'victory' : 'defeat';
  state.waveActive = false;
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(BEST_KEY, String(state.best));
  }
  if (won) sfxVictory(state.audio);
  else sfxDefeat(state.audio);
  syncUI();
}

function frame(ts) {
  const dt = Math.min(0.1, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  acc += dt;
  while (acc >= STEP) {
    step(STEP);
    acc -= STEP;
  }
  drawWorld(ctx, state);
  // Refresh the HUD every frame: gold, score, lives and foes-left change
  // during combat, when no UI event fires to sync them.
  syncUI();
  if (shotMode && !window.__shotReady) {
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

// Run the simulation forward by `seconds` without rendering (shot scenes).
function simulate(seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) step(STEP);
}

// ---- DOM ----
const $ = (id) => document.getElementById(id);

function syncUI() {
  $('hud-gold').textContent = state.gold;
  $('hud-wave').textContent = state.wave === 0 ? '—' : `${state.wave}/${TOTAL_WAVES}`;
  $('hud-lives').textContent = state.lives;
  $('hud-score').textContent = state.score;
  $('hud-best').textContent = state.best;
  $('hud-enemies').textContent = state.waveActive ? enemiesRemaining(state) : '—';
  // Wave button.
  const wb = $('wave-btn');
  if (state.phase !== 'playing') {
    wb.disabled = true;
    wb.textContent = 'Start wave';
  } else if (state.waveActive) {
    wb.disabled = true;
    wb.textContent = `Wave ${state.wave} in progress…`;
  } else if (state.wave === 0) {
    wb.disabled = false;
    wb.textContent = 'Start wave 1 (Space)';
  } else if (state.wave >= TOTAL_WAVES) {
    wb.disabled = true;
    wb.textContent = 'All waves cleared';
  } else {
    wb.disabled = false;
    wb.textContent = `Call wave ${state.wave + 1} early (+${Math.min(60, Math.ceil(state.betweenTimer) * 12)}g)`;
  }
  // Tower buttons: affordability + selection.
  for (const type of TOWER_ORDER) {
    const btn = $(`tower-${type}`);
    btn.classList.toggle('selected', state.placeType === type);
    btn.classList.toggle('poor', state.gold < TOWERS[type].cost);
  }
  // Selected tower panel.
  const panel = $('tower-panel');
  if (state.selected && state.phase === 'playing') {
    const t = state.selected;
    const stats = towerStats(t.type, t.tier);
    panel.classList.remove('hidden');
    $('panel-name').textContent = `${stats.name} — Tier ${t.tier + 1}`;
    $('panel-stats').textContent = `DMG ${stats.damage} · RNG ${stats.range} · ${stats.rate.toFixed(1)}/s`;
    const up = $('panel-upgrade');
    const cost = upgradeCost(t.type, t.tier);
    if (cost === null) {
      up.disabled = true;
      up.textContent = 'Max tier';
    } else {
      up.disabled = state.gold < cost;
      up.textContent = `Upgrade — ${cost}g`;
    }
    $('panel-sell').textContent = `Sell — ${sellValue(t)}g`;
  } else {
    panel.classList.add('hidden');
  }
  // Overlays.
  $('overlay-title').classList.toggle('hidden', state.phase !== 'title');
  $('overlay-pause').classList.toggle('hidden', state.phase !== 'paused');
  $('overlay-victory').classList.toggle('hidden', state.phase !== 'victory');
  $('overlay-defeat').classList.toggle('hidden', state.phase !== 'defeat');
  if (state.phase === 'victory' || state.phase === 'defeat') {
    fillEndStats(state.phase === 'victory' ? 'victory' : 'defeat');
  }
  $('title-best').textContent = state.best;
  $('mute-btn').textContent = state.audio.muted ? 'Sound: OFF (M)' : 'Sound: ON (M)';
  $('pause-btn').textContent = state.phase === 'paused' ? 'Resume (P)' : 'Pause (P)';
}

function fillEndStats(kind) {
  const acc = state.stats.shotsFired > 0
    ? Math.round((state.stats.shotsHit / state.stats.shotsFired) * 100)
    : 0;
  $(`${kind}-waves`).textContent = state.wave;
  $(`${kind}-kills`).textContent = state.stats.kills;
  $(`${kind}-score`).textContent = state.score;
  $(`${kind}-acc`).textContent = `${acc}%`;
  $(`${kind}-best`).textContent = state.best;
}

function restart() {
  // Reset in place (Object.assign) so the input handlers, which close over
  // this state object, keep working after a restart.
  const best = state.best;
  const muted = state.audio.muted;
  const flashGold = state.flashGold;
  const fresh = freshState();
  fresh.best = best;
  fresh.audio.muted = muted;
  fresh.simulate = simulate;
  fresh.flashGold = flashGold;
  Object.assign(state, fresh);
  state.phase = 'playing';
  state.betweenTimer = 0;
  syncUI();
}

function startGame() {
  state.phase = 'playing';
  state.betweenTimer = 0;
  syncUI();
}

function wireUI() {
  $('start-btn').addEventListener('click', startGame);
  $('how-btn').addEventListener('click', () => {
    $('how-panel').classList.toggle('hidden');
  });
  $('wave-btn').addEventListener('click', () => {
    if (state.phase !== 'playing' || state.waveActive) return;
    if (state.wave === 0) startWave(state);
    else callEarly(state);
    syncUI();
  });
  for (const type of TOWER_ORDER) {
    $(`tower-${type}`).addEventListener('click', () => {
      if (state.phase !== 'playing') return;
      state.placeType = state.placeType === type ? null : type;
      state.selected = null;
      syncUI();
    });
  }
  $('panel-upgrade').addEventListener('click', () => {
    const t = state.selected;
    if (!t) return;
    const cost = upgradeCost(t.type, t.tier);
    if (cost === null || state.gold < cost) return;
    state.gold -= cost;
    upgradeTower(t);
    sfxCoin(state.audio);
    syncUI();
  });
  $('panel-sell').addEventListener('click', () => {
    const t = state.selected;
    if (!t) return;
    state.gold += sellValue(t);
    state.towers = state.towers.filter((v) => v !== t);
    state.selected = null;
    sfxCoin(state.audio);
    syncUI();
  });
  $('panel-close').addEventListener('click', () => {
    state.selected = null;
    syncUI();
  });
  $('pause-btn').addEventListener('click', () => {
    if (state.phase === 'playing') state.phase = 'paused';
    else if (state.phase === 'paused') state.phase = 'playing';
    syncUI();
  });
  $('resume-btn').addEventListener('click', () => {
    state.phase = 'playing';
    syncUI();
  });
  $('restart-btn').addEventListener('click', restart);
  $('mute-btn').addEventListener('click', () => {
    toggleMute(state.audio);
    syncUI();
  });
  $('victory-again').addEventListener('click', restart);
  $('defeat-again').addEventListener('click', restart);
  // Flash the gold counter when the player cannot afford a tower.
  state.flashGold = () => {
    const el = $('hud-gold');
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 400);
  };
}

function boot() {
  canvas = $('game');
  ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = GRID_ROWS * CELL;
  state.simulate = simulate;
  const ui = {
    sync: syncUI,
    restart,
    toggleMute: () => {
      toggleMute(state.audio);
      syncUI();
    },
    flashGold: () => state.flashGold(),
    keepPlacing: false,
  };
  wireUI();
  bindInput(state, canvas, ui);
  shotMode = readShotParams();
  if (shotMode) {
    setupShot(state, shotMode.scene, shotMode.seed);
    syncUI();
    // One frame is drawn by the loop; __shotReady is set there.
  } else {
    syncUI();
  }
  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', boot);
