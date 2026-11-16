// Emberkeep — towers: placement, upgrades, targeting, firing.
// Towers target the enemy furthest along the path within range.
// Projectiles are pooled; Frost applies a slow, Storm chains lightning.

import { TOWERS, CELL, SELL_REFUND } from './config.js';
import { cellToPx } from './world.js';
import { spawnBurst, spawnNumber } from './particles.js';
import { sfxShoot, sfxExplosion } from './audio.js';
import { damageEnemy, slowEnemy, splitEnemy } from './enemies.js';

let nextTowerId = 1;

export function towerStats(type, tier) {
  const base = TOWERS[type];
  const stats = {
    type,
    name: base.name,
    range: base.range,
    rate: base.rate,
    damage: base.damage,
    color: base.color,
    dark: base.dark,
    slow: base.slow,
    slowTime: base.slowTime,
    chain: base.chain,
  };
  for (let i = 0; i < tier; i++) {
    Object.assign(stats, base.upgrades[i]);
  }
  return stats;
}

export function upgradeCost(type, tier) {
  if (tier >= 2) return null;
  return TOWERS[type].upgrades[tier].cost;
}

export function makeTower(type, col, row) {
  const pos = cellToPx(col, row);
  return {
    id: nextTowerId++,
    type,
    col,
    row,
    x: pos.x,
    y: pos.y,
    tier: 0,
    cooldown: 0,
    angle: -Math.PI / 2,
    invested: TOWERS[type].cost,
    flash: 0,
  };
}

export function sellValue(tower) {
  return Math.floor(tower.invested * SELL_REFUND);
}

export function upgradeTower(tower) {
  const cost = upgradeCost(tower.type, tower.tier);
  if (cost === null) return null;
  tower.tier += 1;
  tower.invested += cost;
  return cost;
}

// Furthest-along enemy in range (the one closest to the crystal).
export function pickTarget(tower, enemies) {
  const stats = towerStats(tower.type, tower.tier);
  let best = null;
  let bestDist = -1;
  for (const e of enemies) {
    if (e.dead || e.reached) continue;
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= stats.range + e.radius && e.dist > bestDist) {
      best = e;
      bestDist = e.dist;
    }
  }
  return best;
}

// Fire one shot: instant-hit for Frost/Storm, projectile for Ember/Thorn.
export function fireTower(state, tower, target) {
  const stats = towerStats(tower.type, tower.tier);
  tower.cooldown = 1 / stats.rate;
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.flash = 0.08;
  sfxShoot(state.audio, tower.type);

  if (tower.type === 'frost') {
    // Frost pulse: damages + slows everything in range.
    spawnBurst(state.particles, tower.x, tower.y, '#bae6fd', 10, 90);
    for (const e of state.enemies) {
      if (e.dead || e.reached) continue;
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d <= stats.range + e.radius) {
        slowEnemy(e, stats.slow, stats.slowTime, state.time);
        hitEnemy(state, e, stats.damage, stats.color, false);
      }
    }
    return;
  }
  if (tower.type === 'storm') {
    // Chain lightning: jump to nearest unhit enemies.
    let current = target;
    const hit = new Set();
    let dmg = stats.damage;
    let fromX = tower.x;
    let fromY = tower.y;
    for (let i = 0; i < stats.chain && current; i++) {
      hit.add(current.id);
      state.lightning.push({ x1: fromX, y1: fromY, x2: current.x, y2: current.y, life: 0.15 });
      hitEnemy(state, current, dmg, stats.color, false);
      dmg = Math.round(dmg * 0.75);
      fromX = current.x;
      fromY = current.y;
      let next = null;
      let nextD = 130;
      for (const e of state.enemies) {
        if (e.dead || e.reached || hit.has(e.id)) continue;
        const d = Math.hypot(e.x - fromX, e.y - fromY);
        if (d < nextD) {
          next = e;
          nextD = d;
        }
      }
      current = next;
    }
    return;
  }
  // Projectile shot (Ember / Thorn).
  const proj = allocProjectile(state);
  proj.x = tower.x;
  proj.y = tower.y;
  proj.target = target;
  proj.speed = tower.type === 'thorn' ? 520 : 420;
  proj.damage = stats.damage;
  proj.color = stats.color;
  proj.radius = tower.type === 'thorn' ? 6 : 4;
  proj.alive = true;
  proj.kind = tower.type;
}

function allocProjectile(state) {
  const p = state.projectiles.find((v) => !v.alive);
  if (p) return p;
  const fresh = { x: 0, y: 0, target: null, speed: 0, damage: 0, color: '#fff', radius: 4, alive: false, kind: 'ember' };
  state.projectiles.push(fresh);
  return fresh;
}

export function updateProjectiles(state, dt) {
  for (const p of state.projectiles) {
    if (!p.alive) continue;
    const t = p.target;
    if (!t || t.dead || t.reached) {
      p.alive = false;
      continue;
    }
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + t.radius) {
      hitEnemy(state, t, p.damage, p.color, p.kind === 'thorn');
      p.alive = false;
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
}

// Apply damage, handle death (bounty, split, particles, stats).
export function hitEnemy(state, e, dmg, color, big) {
  const died = damageEnemy(e, dmg);
  state.stats.shotsHit += 1;
  spawnNumber(state.particles, e.x, e.y, String(dmg), color);
  if (died) {
    state.stats.kills += 1;
    state.gold += e.bounty;
    state.score += e.bounty * 10;
    state.goldFloat.push({ x: e.x, y: e.y, text: `+${e.bounty}g`, life: 0.9 });
    spawnBurst(state.particles, e.x, e.y, e.color, big ? 22 : 12, big ? 160 : 110);
    sfxExplosion(state.audio, e.type === 'boss');
    if (e.type === 'boss') {
      state.particles.shake = 14;
      state.score += 500;
    }
    if (e.splitsInto) {
      state.enemies.push(...splitEnemy(e, state.wave, state.path));
    }
  } else if (big) {
    spawnBurst(state.particles, e.x, e.y, color, 4, 70);
  }
}

export function updateTowers(state, dt) {
  for (const t of state.towers) {
    if (t.cooldown > 0) t.cooldown -= dt;
    if (t.flash > 0) t.flash -= dt;
    if (t.cooldown > 0) continue;
    const target = pickTarget(t, state.enemies);
    if (target) {
      state.stats.shotsFired += 1;
      fireTower(state, t, target);
    }
  }
}
