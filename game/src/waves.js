// Emberkeep — waves: composition, spawning, boss waves, early-call bonus.
// A wave spawns its roster over time; the next wave starts when the field is
// clear (or the player calls it early for bonus gold).

import { WAVES, SPAWN_GAP, WAVE_BOUNTY_BONUS, TOTAL_WAVES, EARLY_CALL_BONUS } from './config.js';
import { makeEnemy } from './enemies.js';
import { shuffle } from './random.js';
import { sfxHorn, sfxCoin } from './audio.js';

const ROSTER_TYPES = ['shambler', 'swift', 'bulwark', 'splitter', 'wisp'];

// Build the spawn roster for a wave: shuffled enemy types + a boss on 5/10/15/20.
export function buildRoster(wave, rng) {
  const counts = WAVES[wave - 1];
  const roster = [];
  for (let i = 0; i < counts.length; i++) {
    for (let n = 0; n < counts[i]; n++) roster.push(ROSTER_TYPES[i]);
  }
  const mixed = shuffle(rng, roster);
  if (wave % 5 === 0) {
    // Boss walks in the middle of the pack.
    mixed.splice(Math.floor(mixed.length / 2), 0, 'boss');
  }
  return mixed;
}

export function bossTier(wave) {
  return Math.floor(wave / 5);
}

export function startWave(state) {
  state.wave += 1;
  state.waveActive = true;
  state.roster = buildRoster(state.wave, state.rng);
  state.spawnTimer = 0.5;
  state.spawned = 0;
  state.banner = state.wave % 5 === 0 ? `WAVE ${state.wave} — THE HOLLOW KING` : `WAVE ${state.wave}`;
  state.bannerUntil = state.time + 2.2;
  sfxHorn(state.audio);
}

// Call the next wave early while the countdown runs: bonus gold per second left.
export function callEarly(state) {
  if (state.waveActive || state.wave >= TOTAL_WAVES) return 0;
  const bonus = Math.min(60, Math.ceil(state.betweenTimer) * EARLY_CALL_BONUS);
  state.gold += bonus;
  state.betweenTimer = 0;
  startWave(state);
  return bonus;
}

export function updateSpawning(state, dt) {
  if (!state.waveActive) return;
  if (state.spawned >= state.roster.length) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  const type = state.roster[state.spawned];
  state.enemies.push(makeEnemy(type, state.wave, state.path, bossTier(state.wave)));
  state.spawned += 1;
  state.spawnTimer = SPAWN_GAP * (type === 'boss' ? 2.2 : 1);
}

// True when the wave is done: roster exhausted and no live enemies.
export function waveCleared(state) {
  if (!state.waveActive) return false;
  if (state.spawned < state.roster.length) return false;
  return !state.enemies.some((e) => !e.dead && !e.reached);
}

export function completeWave(state) {
  state.waveActive = false;
  const bonus = WAVE_BOUNTY_BONUS + state.wave * 2;
  state.gold += bonus;
  state.score += 100 * state.wave;
  sfxCoin(state.audio);
  state.goldFloat.push({ x: 640, y: 120, text: `Wave bonus +${bonus}g`, life: 1.4 });
  if (state.wave >= TOTAL_WAVES) {
    state.phase = 'victory';
    state.endTime = state.time;
  } else {
    state.betweenTimer = 6;
  }
}

export function enemiesRemaining(state) {
  const alive = state.enemies.filter((e) => !e.dead && !e.reached).length;
  const queued = state.waveActive ? state.roster.length - state.spawned : 0;
  return alive + queued;
}
