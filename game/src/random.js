// Emberkeep — seeded RNG (mulberry32). Deterministic: the same seed gives the
// same sequence, so screenshot scenes and replays are reproducible.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Roll a value in [min, max) from a rng function.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Pick one element of an array.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Fisher-Yates shuffle of a copy, driven by the seeded rng.
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}
