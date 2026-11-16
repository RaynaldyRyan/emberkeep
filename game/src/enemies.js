// Emberkeep — enemies: definitions, movement along the path, HP, death/split.
// Enemies walk the waypoint path by distance; a Wisp weaves side to side.

import { ENEMIES, WAVE_HP_SCALE, BOSS_HP_SCALE } from './config.js';
import { pointAtDistance, pathLength } from './world.js';

let nextId = 1;

export function makeEnemy(type, wave, path, bossTier) {
  const def = ENEMIES[type];
  let hpScale = 1 + WAVE_HP_SCALE * (wave - 1);
  if (type === 'boss') hpScale *= Math.pow(BOSS_HP_SCALE, bossTier - 1);
  const hp = Math.round(def.hp * hpScale);
  return {
    id: nextId++,
    type,
    name: def.name,
    x: path[0].x,
    y: path[0].y,
    dist: 0,
    speed: def.speed,
    radius: def.radius,
    hp,
    maxHp: hp,
    bounty: def.bounty,
    leak: def.leak,
    color: def.color,
    shape: def.shape,
    weave: !!def.weave,
    weavePhase: Math.random() * Math.PI * 2,
    slowUntil: 0,
    slowFactor: 1,
    splitsInto: def.splitsInto || null,
    reached: false,
    dead: false,
    flash: 0,
  };
}

// Move one enemy along the path for dt seconds. Returns 'reached' when it
// arrives at the crystal, 'ok' otherwise.
export function moveEnemy(e, path, totalLen, dt, now) {
  if (e.dead || e.reached) return 'ok';
  const slowed = now < e.slowUntil ? e.slowFactor : 1;
  e.dist += e.speed * slowed * dt;
  if (e.dist >= totalLen) {
    e.reached = true;
    return 'reached';
  }
  const p = pointAtDistance(path, e.dist);
  e.x = p.x;
  e.y = p.y;
  if (e.weave) {
    const off = Math.sin(now * 3 + e.weavePhase) * 14;
    e.x += Math.cos(p.angle + Math.PI / 2) * off;
    e.y += Math.sin(p.angle + Math.PI / 2) * off;
  }
  if (e.flash > 0) e.flash -= dt;
  return 'ok';
}

export function damageEnemy(e, dmg) {
  e.hp -= dmg;
  e.flash = 0.08;
  if (e.hp <= 0) {
    e.dead = true;
    return true;
  }
  return false;
}

export function slowEnemy(e, factor, seconds, now) {
  if (factor < e.slowFactor || now >= e.slowUntil) {
    e.slowFactor = factor;
  }
  e.slowUntil = Math.max(e.slowUntil, now + seconds);
}

// A Splitter dies into two Motes at its position, continuing down the path.
export function splitEnemy(e, wave, path) {
  if (!e.splitsInto) return [];
  const out = [];
  for (let i = 0; i < 2; i++) {
    const m = makeEnemy(e.splitsInto, wave, path, 1);
    m.dist = Math.max(0, e.dist - 6 - i * 10);
    const p = pointAtDistance(path, m.dist);
    m.x = p.x;
    m.y = p.y;
    out.push(m);
  }
  return out;
}

export { pathLength };
