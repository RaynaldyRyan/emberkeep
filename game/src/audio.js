// Emberkeep — synthesized sound effects via WebAudio. No audio files:
// every effect is an oscillator (or noise buffer) shaped in code.
// Audio starts on the first user gesture; M toggles mute.

export function makeAudio() {
  return {
    ctx: null,
    master: null,
    muted: false,
    noiseBuf: null,
  };
}

function ensureCtx(a) {
  if (a.ctx) {
    if (a.ctx.state === 'suspended') a.ctx.resume();
    return a.ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  a.ctx = new AC();
  a.master = a.ctx.createGain();
  a.master.gain.value = 0.35;
  a.master.connect(a.ctx.destination);
  // Shared noise buffer for thuds and explosions.
  const len = a.ctx.sampleRate * 0.5;
  a.noiseBuf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const data = a.noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return a.ctx;
}

function tone(a, freq, dur, type, vol, slideTo) {
  const ctx = ensureCtx(a);
  if (!ctx || a.muted) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g);
  g.connect(a.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(a, dur, vol, filterFreq) {
  const ctx = ensureCtx(a);
  if (!ctx || a.muted) return;
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = a.noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(a.master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export function sfxShoot(a, kind) {
  if (kind === 'storm') tone(a, 880, 0.08, 'square', 0.12, 220);
  else if (kind === 'thorn') tone(a, 220, 0.14, 'triangle', 0.2, 90);
  else if (kind === 'frost') tone(a, 1200, 0.1, 'sine', 0.12, 700);
  else tone(a, 660, 0.06, 'square', 0.08, 440);
}

export function sfxHit(a) {
  noise(a, 0.07, 0.1, 900);
}

export function sfxExplosion(a, big) {
  noise(a, big ? 0.5 : 0.25, big ? 0.35 : 0.18, big ? 500 : 800);
  tone(a, 120, big ? 0.4 : 0.2, 'sine', 0.25, 40);
}

export function sfxCoin(a) {
  tone(a, 1320, 0.09, 'sine', 0.14, 1760);
}

export function sfxHorn(a) {
  tone(a, 196, 0.5, 'sawtooth', 0.16, 196);
  tone(a, 294, 0.5, 'sawtooth', 0.1, 294);
}

export function sfxPlace(a) {
  tone(a, 440, 0.08, 'triangle', 0.15, 660);
}

export function sfxError(a) {
  tone(a, 160, 0.15, 'square', 0.12, 110);
}

export function sfxLeak(a) {
  tone(a, 110, 0.4, 'sawtooth', 0.2, 55);
}

export function sfxVictory(a) {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => tone(a, f, 0.3, 'triangle', 0.18), i * 140));
}

export function sfxDefeat(a) {
  const notes = [392, 330, 262, 196];
  notes.forEach((f, i) => setTimeout(() => tone(a, f, 0.35, 'sawtooth', 0.12), i * 170));
}

export function toggleMute(a) {
  a.muted = !a.muted;
  if (a.master) a.master.gain.value = a.muted ? 0 : 0.35;
  return a.muted;
}

// Unlock audio on first gesture (called from input handlers).
export function unlockAudio(a) {
  ensureCtx(a);
}
