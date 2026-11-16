// Emberkeep — mouse + keyboard input. Clicks place or select towers, keys
// pick towers (1-4), start waves (Space), pause (P), restart (R), mute (M).

import { CELL, TOWER_ORDER, TOWERS } from './config.js';
import { canBuildAt } from './world.js';
import { makeTower } from './towers.js';
import { startWave, callEarly } from './waves.js';
import { sfxPlace, sfxError, unlockAudio } from './audio.js';

export function bindInput(state, canvas, ui) {
  canvas.addEventListener('mousemove', (ev) => {
    const pos = toGameCoords(canvas, ev);
    state.hoverCell = { col: Math.floor(pos.x / CELL), row: Math.floor(pos.y / CELL) };
    state.hoverValid = state.placeType ? canBuildAt(state, state.hoverCell.col, state.hoverCell.row) : false;
  });

  canvas.addEventListener('mouseleave', () => {
    state.hoverCell = null;
  });

  canvas.addEventListener('click', (ev) => {
    unlockAudio(state.audio);
    if (state.phase !== 'playing') return;
    const pos = toGameCoords(canvas, ev);
    const col = Math.floor(pos.x / CELL);
    const row = Math.floor(pos.y / CELL);
    if (state.placeType) {
      tryPlace(state, col, row, ui);
      return;
    }
    // Select a placed tower, or deselect.
    const hit = state.towers.find((t) => t.col === col && t.row === row);
    state.selected = hit || null;
    ui.sync();
  });

  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    state.placeType = null;
    state.selected = null;
    ui.sync();
  });

  window.addEventListener('keydown', (ev) => {
    unlockAudio(state.audio);
    if (ev.repeat) return;
    const k = ev.key.toLowerCase();
    if (k >= '1' && k <= '4') {
      const type = TOWER_ORDER[Number(k) - 1];
      if (state.phase === 'playing') {
        state.placeType = state.placeType === type ? null : type;
        state.selected = null;
        ui.sync();
      }
      return;
    }
    if (k === ' ') {
      ev.preventDefault();
      if (state.phase === 'playing' && !state.waveActive) {
        if (state.betweenTimer > 0) callEarly(state);
        else startWave(state);
        ui.sync();
      }
      return;
    }
    if (k === 'p') {
      if (state.phase === 'playing') state.phase = 'paused';
      else if (state.phase === 'paused') state.phase = 'playing';
      ui.sync();
      return;
    }
    if (k === 'r') {
      if (state.phase === 'playing' || state.phase === 'paused' || state.phase === 'victory' || state.phase === 'defeat') {
        ui.restart();
      }
      return;
    }
    if (k === 'm') {
      ui.toggleMute();
      return;
    }
    if (k === 'escape') {
      state.placeType = null;
      state.selected = null;
      ui.sync();
    }
  });
}

export function tryPlace(state, col, row, ui) {
  if (!state.placeType) return;
  const cost = TOWERS[state.placeType].cost;
  if (!canBuildAt(state, col, row)) {
    sfxError(state.audio);
    return;
  }
  if (state.gold < cost) {
    sfxError(state.audio);
    ui.flashGold();
    return;
  }
  state.gold -= cost;
  state.towers.push(makeTower(state.placeType, col, row));
  state.stats.built += 1;
  sfxPlace(state.audio);
  if (!ui.keepPlacing) state.placeType = null;
  ui.sync();
}

function toGameCoords(canvas, ev) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (ev.clientX - rect.left) * scaleX,
    y: (ev.clientY - rect.top) * scaleY,
  };
}
