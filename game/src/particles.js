// Emberkeep — particles, damage numbers and screen shake.
// Object pools: particles and numbers are reused, never allocated per frame.

export const MAX_PARTICLES = 400;
export const MAX_NUMBERS = 60;

export function makeParticles() {
  return {
    pool: [],
    numbers: [],
    shake: 0,
    shakeX: 0,
    shakeY: 0,
  };
}

function allocParticle(p) {
  if (p.pool.length < MAX_PARTICLES) {
    const pt = { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#fff', gravity: 0 };
    p.pool.push(pt);
    return pt;
  }
  // Pool full: recycle the oldest dead one, else the first.
  for (const pt of p.pool) {
    if (pt.life <= 0) return pt;
  }
  return p.pool[0];
}

export function spawnBurst(p, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const pt = allocParticle(p);
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    pt.x = x;
    pt.y = y;
    pt.vx = Math.cos(a) * s;
    pt.vy = Math.sin(a) * s;
    pt.maxLife = 0.35 + Math.random() * 0.45;
    pt.life = pt.maxLife;
    pt.size = 2 + Math.random() * 3.5;
    pt.color = color;
    pt.gravity = 60;
  }
}

export function spawnTrail(p, x, y, color) {
  const pt = allocParticle(p);
  pt.x = x;
  pt.y = y;
  pt.vx = (Math.random() - 0.5) * 20;
  pt.vy = (Math.random() - 0.5) * 20;
  pt.maxLife = 0.25;
  pt.life = 0.25;
  pt.size = 2 + Math.random() * 2;
  pt.color = color;
  pt.gravity = 0;
}

export function spawnNumber(p, x, y, text, color) {
  let n = p.numbers.find((v) => v.life <= 0);
  if (!n) {
    if (p.numbers.length >= MAX_NUMBERS) n = p.numbers[0];
    else {
      n = { x: 0, y: 0, life: 0, maxLife: 0.8, text: '', color: '#fff' };
      p.numbers.push(n);
    }
  }
  n.x = x + (Math.random() - 0.5) * 12;
  n.y = y - 8;
  n.life = 0.8;
  n.maxLife = 0.8;
  n.text = text;
  n.color = color;
}

export function addShake(p, amount) {
  p.shake = Math.min(14, p.shake + amount);
}

export function updateParticles(p, dt) {
  for (const pt of p.pool) {
    if (pt.life <= 0) continue;
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += pt.gravity * dt;
    pt.vx *= 0.98;
    pt.vy *= 0.98;
  }
  for (const n of p.numbers) {
    if (n.life <= 0) continue;
    n.life -= dt;
    n.y -= 28 * dt;
  }
  if (p.shake > 0) {
    p.shake = Math.max(0, p.shake - dt * 30);
    p.shakeX = (Math.random() - 0.5) * 2 * p.shake;
    p.shakeY = (Math.random() - 0.5) * 2 * p.shake;
  } else {
    p.shakeX = 0;
    p.shakeY = 0;
  }
}

export function drawParticles(ctx, p) {
  for (const pt of p.pool) {
    if (pt.life <= 0) continue;
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const n of p.numbers) {
    if (n.life <= 0) continue;
    const a = Math.max(0, n.life / n.maxLife);
    ctx.globalAlpha = a;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = n.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(n.text, n.x, n.y);
    ctx.fillText(n.text, n.x, n.y);
  }
  ctx.globalAlpha = 1;
}
