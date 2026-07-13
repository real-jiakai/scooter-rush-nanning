// main.js — boot, input, screen state machine, and the render loop
// (rAF with a setTimeout fallback so the game survives hidden tabs).

import { CHARACTERS } from './characters.js';
import { buildSprites } from './sprites.js';
import { createGame } from './game.js';
import { screens } from './screens.js';
import { audio } from './audio.js';
import { fx } from './particles.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const stage = document.getElementById('stage');
const touchPad = document.getElementById('touch');

const sprites = buildSprites();

let state = 'title';            // title | select | countdown | race | paused | results
let demoGame = null;
let raceGame = null;
let raceChar = null;
let countdownT = 0;
let countdownShown = '';
let goBannerT = 0;              // the GO! banner lingers while controls are already live

const input = { left: false, right: false, gas: false, brake: false, horn: false };
const demoInput = { left: false, right: false, gas: false, brake: false, horn: false };

let invincible = false;
try { invincible = localStorage.getItem('rush.invincible') === '1'; } catch { /* ignore */ }

function setInvincible(v) {
  invincible = v;
  try { localStorage.setItem('rush.invincible', v ? '1' : '0'); } catch { /* ignore */ }
}

let passenger = false;
try { passenger = localStorage.getItem('rush.passenger') === '1'; } catch { /* ignore */ }

function setPassenger(v) {
  passenger = v;
  try { localStorage.setItem('rush.passenger', v ? '1' : '0'); } catch { /* ignore */ }
}

/* ---------- persistence ---------- */

function loadBest() {
  try {
    const raw = localStorage.getItem('rush.best');
    if (!raw) return null;
    const b = JSON.parse(raw);
    if (typeof b.score === 'number' && typeof b.time === 'number') return b;
  } catch { /* ignore */ }
  return null;
}

function saveBest(b) {
  try { localStorage.setItem('rush.best', JSON.stringify(b)); } catch { /* ignore */ }
}

/* ---------- game lifecycle ---------- */

function makeDemo() {
  if (demoGame) demoGame.dispose();
  fx.clear();
  demoGame = createGame(CHARACTERS[2], sprites, { demo: true });
  demoGame.green();
}

function startRace(char) {
  raceChar = char;
  if (raceGame) raceGame.dispose();
  if (demoGame) { demoGame.dispose(); demoGame = null; }
  fx.clear();
  raceGame = createGame(char, sprites, {
    invincible,
    passenger,
    onZone: text => screens.toast(text),
    onFinish: stats => {
      // cheat runs never overwrite the legitimate record
      const best = loadBest();
      const newBest = !stats.invincible && (!best || stats.score > best.score);
      if (newBest) saveBest({ score: stats.score, time: stats.time });
      state = 'results';
      screens.showResults(stats, newBest);
    },
  });
  state = 'countdown';
  countdownT = 0;
  countdownShown = '';
  goBannerT = 0;
}

function goHome() {
  if (raceGame) { raceGame.dispose(); raceGame = null; }
  state = 'title';
  makeDemo();
  screens.showTitle(loadBest());
}

screens.init(overlay, {
  onStart: () => { state = 'select'; screens.showSelect(); },
  onSelect: char => startRace(char),
  getInvincible: () => invincible,
  onToggleInvincible: () => { setInvincible(!invincible); return invincible; },
  getPassenger: () => passenger,
  onTogglePassenger: () => { setPassenger(!passenger); return passenger; },
  onResume: () => { state = 'race'; audio.engineStart(); screens.hide(); },
  onRestart: () => startRace(raceChar),
  onChangeRider: () => {
    if (raceGame) { raceGame.dispose(); raceGame = null; }
    if (!demoGame) makeDemo();
    state = 'select';
    screens.showSelect();
  },
  onHome: () => goHome(),
});

/* ---------- input ---------- */

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'gas', KeyW: 'gas',
  ArrowDown: 'brake', KeyS: 'brake',
};

window.addEventListener('keydown', e => {
  audio.init();
  const k = KEYMAP[e.code];
  if (k) {
    input[k] = true;
    e.preventDefault();
    return;
  }
  // let focused buttons keep their native Space/Enter activation
  const onButton = e.target instanceof HTMLElement && e.target.tagName === 'BUTTON';
  if (e.code === 'Space') {
    if (state === 'race') {
      e.preventDefault();
      input.horn = true;
    } else if (state === 'title' && !onButton) {
      state = 'select';
      screens.showSelect();
    }
    return;
  }
  if (e.code === 'Enter' && state === 'title' && !onButton) {
    state = 'select';
    screens.showSelect();
    return;
  }
  if (e.code === 'KeyM') {
    audio.toggleMute();
    const chip = document.getElementById('chip-mute');
    if (chip) chip.textContent = audio.muted ? '🔇' : '🔊';
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state === 'race') {
      state = 'paused';
      audio.engineStop();
      screens.showPause();
    } else if (state === 'paused') {
      state = 'race';
      audio.engineStart();
      screens.hide();
    }
  }
});

window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (k) input[k] = false;
});

// If the window loses focus mid-race, keys can get stuck down — clear them.
window.addEventListener('blur', () => {
  input.left = input.right = input.gas = input.brake = false;
});

/* touch controls */
if (window.matchMedia('(pointer: coarse)').matches) {
  touchPad.hidden = false;
  const bind = (id, key) => {
    const b = document.getElementById(id);
    const on = e => { e.preventDefault(); audio.init(); input[key] = true; };
    const off = e => { e.preventDefault(); input[key] = false; };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
  };
  bind('touch-left', 'left');
  bind('touch-right', 'right');
  bind('touch-gas', 'gas');
  document.getElementById('touch-horn').addEventListener('pointerdown', e => {
    e.preventDefault();
    audio.init();
    if (state === 'race') input.horn = true;
  });
}

/* ---------- layout ---------- */

let lastVW = 0, lastVH = 0;

function layout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (!vw || !vh) return;   // hidden/zero-sized pane — keep previous size
  lastVW = vw; lastVH = vh;
  const s = Math.min(vw / 960, vh / 540) * 0.98;
  canvas.style.width = Math.round(960 * s) + 'px';
  canvas.style.height = Math.round(540 * s) + 'px';
  const cr = canvas.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();
  overlay.style.left = (cr.left - sr.left) + 'px';
  overlay.style.top = (cr.top - sr.top) + 'px';
  overlay.style.width = cr.width + 'px';
  overlay.style.height = cr.height + 'px';
}

window.addEventListener('resize', layout);
document.addEventListener('visibilitychange', () => layout());
layout();

/* ---------- countdown ---------- */

function stepCountdown(dt) {
  countdownT += dt;
  const label = countdownT < 0.9 ? '3' : countdownT < 1.8 ? '2' : countdownT < 2.7 ? '1' : 'go';
  if (label !== countdownShown) {
    countdownShown = label;
    screens.showCountdown(label);
    if (label === 'go') {
      // controls go live the instant GO flashes — the banner just lingers
      raceGame.green();
      audio.go();
      state = 'race';
      goBannerT = 0.9;
    } else {
      audio.countdown();
    }
  }
}

/* ---------- main loop ---------- */

let last = performance.now();

function step(dt, doRender = true) {
  // the preview pane can resize without firing a resize event
  if (window.innerWidth !== lastVW || window.innerHeight !== lastVH) layout();

  switch (state) {
    case 'title':
    case 'select':
      if (demoGame) {
        demoGame.update(dt, demoInput);
        if (doRender) demoGame.render(ctx, { hud: false });
      }
      break;
    case 'countdown':
      stepCountdown(dt);
      if (raceGame) {
        raceGame.update(dt, state === 'race' ? input : demoInput);
        if (doRender) raceGame.render(ctx);
      }
      break;
    case 'race':
    case 'results':
      if (state === 'race' && goBannerT > 0) {
        goBannerT -= dt;
        if (goBannerT <= 0) screens.hide();
      }
      if (raceGame) {
        raceGame.update(dt, state === 'race' ? input : demoInput);
        if (doRender) raceGame.render(ctx);
      }
      break;
    case 'paused':
      break;   // frozen frame under the pause overlay
  }
}

function tick(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  step(dt);
  scheduleNext();
}

// A pending rAF never fires once the tab goes hidden, so on visibility flips the
// scheduled callback must be cancelled and rescheduled on the other mechanism.
let scheduled = null;   // { raf: id } or { to: id }

function scheduleNext() {
  if (document.hidden) scheduled = { to: setTimeout(() => tick(performance.now()), 100) };
  else scheduled = { raf: requestAnimationFrame(tick) };
}

document.addEventListener('visibilitychange', () => {
  if (!scheduled) return;
  if (scheduled.raf !== undefined) cancelAnimationFrame(scheduled.raf);
  else clearTimeout(scheduled.to);
  last = performance.now();
  scheduleNext();
});

makeDemo();
screens.showTitle(loadBest());
scheduleNext();

/* ---------- debug hooks (used for automated verification) ---------- */

window.__rush = {
  get state() { return state; },
  get game() { return raceGame || demoGame; },
  chars: CHARACTERS,
  start(i = 0) { startRace(CHARACTERS[i]); },
  forceGreen() {
    if (state === 'countdown') {
      raceGame.green();
      countdownT = 99;
      stepCountdown(0);
    }
  },
  warp(km) { if (raceGame) raceGame._debug.warpToKm(km); },
  // synchronously simulate N seconds at 60 fps (verification helper);
  // only the final frame is rendered
  ff(seconds) {
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps - 1; i++) step(1 / 60, false);
    if (steps > 0) step(1 / 60, true);
  },
  speed(pct) { if (raceGame) raceGame._debug.setSpeedPct(pct); },
  stats() { return raceGame ? raceGame.stats() : null; },
};
