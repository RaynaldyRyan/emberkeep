// Emberkeep — all drawing: map, crystal, towers, enemies, projectiles, HUD
// canvas bits (banner, gold floats, placement preview). Menus and the HUD bar
// are DOM; this file draws the world on the canvas.

import { CELL, GRID_COLS, GRID_ROWS, CRYSTAL, GROUND_A, GROUND_B, PATH_COLOR, TOWERS } from './config.js';
import { towerStats } from './towers.js';
import { drawParticles } from './particles.js';

export function drawWorld(ctx, state) {
  ctx.save();
  ctx.translate(state.particles.shakeX, state.particles.shakeY);
  drawGround(ctx, state);
  drawPath(ctx, state);
  drawCrystal(ctx, state);
  drawTowers(ctx, state);
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state);
  drawLightning(ctx, state);
  drawParticles(ctx, state.particles);
  drawPlacement(ctx, state);
  drawBanner(ctx, state);
  drawGoldFloats(ctx, state);
  ctx.restore();
}

function drawGround(ctx, state) {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? GROUND_A : GROUND_B;
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }
  // Decorative stars / embers in the ground, seeded by position.
  ctx.fillStyle = 'rgba(255, 180, 90, 0.12)';
  for (let i = 0; i < 90; i++) {
    const x = ((i * 137.5) % 1280) + 10;
    const y = ((i * 89.3) % 600) + 8;
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPath(ctx, state) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Path edge glow.
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.25)';
  ctx.lineWidth = CELL + 6;
  ctx.beginPath();
  ctx.moveTo(state.path[0].x, state.path[0].y);
  for (const p of state.path) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  // Path body.
  ctx.strokeStyle = PATH_COLOR;
  ctx.lineWidth = CELL;
  ctx.beginPath();
  ctx.moveTo(state.path[0].x, state.path[0].y);
  for (const p of state.path) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  // Direction chevrons along the path.
  ctx.fillStyle = 'rgba(167, 139, 250, 0.35)';
  for (let i = 0; i < state.path.length - 1; i++) {
    const a = state.path[i];
    const b = state.path[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.floor(len / 70);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, -7);
      ctx.lineTo(-5, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  // West gate marker.
  ctx.fillStyle = '#312e81';
  ctx.fillRect(0, state.path[0].y - 28, 12, 56);
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GATE', 16, state.path[0].y + 44);
}

function drawCrystal(ctx, state) {
  const pulse = 1 + Math.sin(state.time * 2.2) * 0.08;
  const { x, y, radius } = CRYSTAL;
  // Glow.
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.2);
  glow.addColorStop(0, 'rgba(255, 170, 60, 0.55)');
  glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 3.2, 0, Math.PI * 2);
  ctx.fill();
  // Pedestal.
  ctx.fillStyle = '#3b2f4a';
  ctx.beginPath();
  ctx.arc(x, y + 8, radius + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6d5a8a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Crystal diamond.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(radius * 0.62, 0);
  ctx.lineTo(0, radius);
  ctx.lineTo(-radius * 0.62, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.7);
  ctx.lineTo(radius * 0.3, 0);
  ctx.lineTo(0, radius * 0.7);
  ctx.lineTo(-radius * 0.3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // HP ring.
  const frac = Math.max(0, state.lives / state.maxLives);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = frac > 0.4 ? '#fbbf24' : '#ef4444';
  ctx.beginPath();
  ctx.arc(x, y, radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
}

function drawTowers(ctx, state) {
  for (const t of state.towers) {
    const stats = towerStats(t.type, t.tier);
    drawTowerBody(ctx, t, stats, state);
  }
  // Range ring for the selected tower.
  if (state.selected) {
    const stats = towerStats(state.selected.type, state.selected.tier);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(state.selected.x, state.selected.y, stats.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawTowerBody(ctx, t, stats, state) {
  const { x, y } = t;
  // Base.
  ctx.fillStyle = '#2a2140';
  ctx.strokeStyle = stats.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Tier pips.
  for (let i = 0; i < t.tier; i++) {
    ctx.fillStyle = stats.color;
    ctx.beginPath();
    ctx.arc(x - 8 + i * 16, y + 15, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Barrel / head, rotated toward the aim angle.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t.angle + Math.PI / 2);
  ctx.fillStyle = stats.color;
  if (t.type === 'ember') {
    // Round turret with a flame tip.
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (t.type === 'frost') {
    // Hexagonal ice crystal.
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * 11;
      const py = Math.sin(a) * 11;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (t.type === 'storm') {
    // Spire with a lightning rod.
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(7, 8);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f5d0fe';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(3, -4);
    ctx.lineTo(-3, -4);
    ctx.closePath();
    ctx.fill();
  } else {
    // Thorn: long needle cannon.
    ctx.fillRect(-3, -18, 6, 30);
    ctx.beginPath();
    ctx.arc(0, 4, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dcfce7';
    ctx.beginPath();
    ctx.arc(0, -14, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Muzzle flash.
  if (t.flash > 0) {
    ctx.fillStyle = 'rgba(255, 240, 180, 0.9)';
    ctx.beginPath();
    ctx.arc(x + Math.cos(t.angle) * 18, y + Math.sin(t.angle) * 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    if (e.dead || e.reached) continue;
    drawEnemyBody(ctx, e, state);
    // HP bar.
    const w = e.radius * 2;
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w, 4);
    ctx.fillStyle = frac > 0.4 ? '#4ade80' : '#ef4444';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w * frac, 4);
  }
}

function drawEnemyBody(ctx, e, state) {
  const flash = e.flash > 0;
  const slowed = state.time < e.slowUntil;
  ctx.save();
  ctx.translate(e.x, e.y);
  const body = flash ? '#ffffff' : e.color;
  ctx.fillStyle = body;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  const r = e.radius;
  if (e.shape === 'blob') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Wobble bumps.
    ctx.beginPath();
    ctx.arc(-r * 0.5, -r * 0.6, r * 0.35, 0, Math.PI * 2);
    ctx.arc(r * 0.5, -r * 0.6, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.shape === 'dart') {
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.7, -r * 0.7);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.7, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (e.shape === 'shell') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.shape === 'pod') {
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.2, r * 0.25, 0, Math.PI * 2);
    ctx.arc(r * 0.3, r * 0.2, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.shape === 'dot') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.shape === 'wisp') {
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (e.shape === 'crown') {
    // Boss: big body + crown spikes.
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.5 - 6, -r * 0.7);
      ctx.lineTo(i * r * 0.5, -r * 1.25);
      ctx.lineTo(i * r * 0.5 + 6, -r * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Eyes (all except dot).
  if (e.shape !== 'dot') {
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.1, Math.max(2, r * 0.14), 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.1, Math.max(2, r * 0.14), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Slow tint ring.
  if (slowed) {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawProjectiles(ctx, state) {
  for (const p of state.projectiles) {
    if (!p.alive) continue;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLightning(ctx, state) {
  for (const L of state.lightning) {
    if (L.life <= 0) continue;
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(L.x1, L.y1);
    const segs = 5;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const mx = L.x1 + (L.x2 - L.x1) * t + (Math.random() - 0.5) * 16;
      const my = L.y1 + (L.y2 - L.y1) * t + (Math.random() - 0.5) * 16;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(L.x2, L.y2);
    ctx.stroke();
  }
}

function drawPlacement(ctx, state) {
  if (!state.placeType || !state.hoverCell) return;
  const { col, row } = state.hoverCell;
  const def = TOWERS[state.placeType];
  const valid = state.hoverValid;
  const x = col * CELL;
  const y = row * CELL;
  ctx.fillStyle = valid ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.strokeStyle = valid ? '#4ade80' : '#ef4444';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
  if (valid) {
    // Range preview.
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + CELL / 2, y + CELL / 2, def.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawBanner(ctx, state) {
  if (state.time > state.bannerUntil || !state.banner) return;
  const a = Math.min(1, (state.bannerUntil - state.time) / 0.5, (state.time - (state.bannerUntil - 2.2)) / 0.2 + 1);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef3c7';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 8;
  ctx.strokeText(state.banner, 640, 150);
  ctx.fillText(state.banner, 640, 150);
  ctx.restore();
}

function drawGoldFloats(ctx, state) {
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const g of state.goldFloat) {
    if (g.life <= 0) continue;
    ctx.globalAlpha = Math.min(1, g.life);
    ctx.fillStyle = '#fde68a';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(g.text, g.x, g.y);
    ctx.fillText(g.text, g.x, g.y);
  }
  ctx.globalAlpha = 1;
}
