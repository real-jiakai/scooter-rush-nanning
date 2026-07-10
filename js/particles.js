// particles.js — screen-space FX (canvas is 960×540 internal units).

const CONFETTI = ['#ffd23e', '#35d07f', '#ff6b6b', '#4dc3ff', '#cf95e8', '#ff9f1c', '#ffffff'];

let items = [];

// corner message feed (pop notifications) — newest at the bottom, stacked upward
// in the lower-right corner so text never covers the action at the impact point
let feed = [];
const FEED_LIFE = 2.4;
const FEED_MAX = 6;

function rnd(a, b) { return a + Math.random() * (b - a); }

export const fx = {
  clear() { items = []; feed = []; },

  feedText(text, color = '#ffffff') {
    feed.push({ text, color, life: FEED_LIFE, max: FEED_LIFE });
    if (feed.length > FEED_MAX) feed.splice(0, feed.length - FEED_MAX);
  },

  // comedic non-violent explosion at screen (x, y); s scales with sprite distance
  spawnPop(x, y, s) {
    const k = Math.max(0.35, Math.min(1.6, s));
    items.push({ type: 'ring', x, y, r: 6 * k, vr: 260 * k, life: 0.36, max: 0.36, w: 5 * k });
    items.push({ type: 'flash', x, y, r: 30 * k, life: 0.14, max: 0.14 });
    const n = Math.round(12 * k) + 6;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const v = rnd(60, 260) * k;
      items.push({
        type: 'conf',
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 120 * k,
        rot: rnd(0, 7),
        vrot: rnd(-9, 9),
        size: rnd(3, 7) * k,
        color: CONFETTI[(Math.random() * CONFETTI.length) | 0],
        life: rnd(0.5, 0.95),
        max: 1,
      });
    }
  },

  // popped NPC floats safely home
  spawnBalloon(x, y, s) {
    const k = Math.max(0.4, Math.min(1.5, s));
    items.push({
      type: 'balloon',
      x, y,
      vy: -rnd(60, 90) * k,
      sway: rnd(0, 7),
      k,
      color: CONFETTI[(Math.random() * CONFETTI.length) | 0],
      life: 2.4,
      max: 2.4,
    });
  },

  popupText(text, x, y, opt = {}) {
    items.push({
      type: 'text',
      text,
      x: Math.max(70, Math.min(890, x)),
      y: Math.max(60, y),
      vy: -46,
      size: opt.size || 22,
      color: opt.color || '#ffffff',
      life: opt.life || 1.1,
      max: opt.life || 1.1,
    });
  },

  crashStars(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      items.push({
        type: 'star',
        x, y,
        a,
        r: 26,
        vr: 60,
        va: rnd(2.5, 4),
        life: 0.9,
        max: 0.9,
      });
    }
  },

  // finish-line celebration raining from the top
  confettiRain(count = 90) {
    for (let i = 0; i < count; i++) {
      items.push({
        type: 'conf',
        x: rnd(0, 960),
        y: rnd(-160, -10),
        vx: rnd(-30, 30),
        vy: rnd(90, 190),
        rot: rnd(0, 7),
        vrot: rnd(-7, 7),
        size: rnd(4, 9),
        color: CONFETTI[(Math.random() * CONFETTI.length) | 0],
        life: rnd(2.4, 4),
        max: 4,
        noGravity: true,
      });
    }
  },

  update(dt) {
    for (const p of items) {
      p.life -= dt;
      switch (p.type) {
        case 'conf':
          if (!p.noGravity) p.vy += 420 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vrot * dt;
          break;
        case 'ring':
          p.r += p.vr * dt;
          break;
        case 'balloon':
          p.y += p.vy * dt;
          p.sway += dt * 3;
          p.x += Math.sin(p.sway) * 26 * dt;
          break;
        case 'text':
          p.y += p.vy * dt;
          p.vy *= (1 - 1.6 * dt);
          break;
        case 'star':
          p.a += p.va * dt;
          p.r += p.vr * dt;
          break;
      }
    }
    items = items.filter(p => p.life > 0);

    for (const f of feed) f.life -= dt;
    feed = feed.filter(f => f.life > 0);
  },

  draw(ctx) {
    for (const p of items) {
      const a = Math.max(0, Math.min(1, p.life / p.max));
      switch (p.type) {
        case 'flash': {
          ctx.globalAlpha = a * 0.85;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (2 - a), 0, 7); ctx.fill();
          break;
        }
        case 'ring': {
          ctx.globalAlpha = a;
          ctx.strokeStyle = '#aef0ff';
          ctx.lineWidth = p.w * a + 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke();
          break;
        }
        case 'conf': {
          ctx.globalAlpha = Math.min(1, a * 1.6);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          ctx.restore();
          break;
        }
        case 'balloon': {
          ctx.globalAlpha = Math.min(1, a * 1.4);
          const r = 11 * p.k;
          // string + tiny passenger going home
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + r * 2.1);
          ctx.stroke();
          ctx.fillStyle = '#e8b98f';
          ctx.beginPath(); ctx.arc(p.x, p.y + r * 2.4, 3.4 * p.k, 0, 7); ctx.fill();
          ctx.fillStyle = '#3b6ea5';
          ctx.fillRect(p.x - 2.6 * p.k, p.y + r * 2.4 + 3 * p.k, 5.2 * p.k, 6 * p.k);
          // balloon
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.82, r, 0, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath(); ctx.arc(p.x - r * 0.3, p.y - r * 0.35, r * 0.22, 0, 7); ctx.fill();
          break;
        }
        case 'text': {
          ctx.globalAlpha = Math.min(1, a * 1.5);
          ctx.font = `bold ${p.size}px "Microsoft YaHei", "Noto Sans SC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 5;
          ctx.strokeStyle = 'rgba(10, 14, 20, 0.85)';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y);
          break;
        }
        case 'star': {
          ctx.globalAlpha = a;
          const sx = p.x + Math.cos(p.a) * p.r;
          const sy = p.y + Math.sin(p.a) * p.r * 0.4 - 20;
          ctx.fillStyle = '#ffd23e';
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(p.a * 2);
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const oa = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const ia = oa + Math.PI / 5;
            ctx.lineTo(Math.cos(oa) * 8, Math.sin(oa) * 8);
            ctx.lineTo(Math.cos(ia) * 3.4, Math.sin(ia) * 3.4);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;

    /* corner feed */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px "Microsoft YaHei", "Noto Sans SC", sans-serif';
    const n = feed.length;
    for (let i = 0; i < n; i++) {
      const f = feed[i];
      const age = f.max - f.life;
      const slide = Math.max(0, 1 - age / 0.18);     // slide in from the right edge
      const y = 484 - (n - 1 - i) * 24;
      const x = 940 + slide * 40;
      ctx.globalAlpha = Math.min(1, f.life / 0.5);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10, 14, 20, 0.85)';
      ctx.strokeText(f.text, x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
    }
    ctx.globalAlpha = 1;
  },
};
