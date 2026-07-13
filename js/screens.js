// screens.js — DOM overlay screens (title / select / countdown / pause / results)
// plus the zone toast. Re-renders the current screen when the language flips.

import { t, getLang, toggleLang, onLangChange, pick } from './i18n.js';
import { CHARACTERS, statBars } from './characters.js';
import { drawPortrait } from './sprites.js';
import { audio } from './audio.js';

let root = null;       // #overlay
let screenEl = null;   // current screen container
let toastEl = null;
let toastTimer = 0;
let handlers = {};
let current = null;    // { name, args }

function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

function fmtTime(s) {
  // work in tenths so 59.96s rounds to 01:00.0, not 00:60.0
  const tenths = Math.round(s * 10);
  const m = Math.floor(tenths / 600);
  const r = tenths % 600;
  return `${String(m).padStart(2, '0')}:${(r / 10).toFixed(1).padStart(4, '0')}`;
}

function chipsHTML() {
  return `<div class="chip-row">
    <button class="chip" id="chip-lang">${getLang() === 'zh' ? 'EN' : '中文'}</button>
    <button class="chip" id="chip-mute">${audio.muted ? '🔇' : '🔊'}</button>
  </div>`;
}

function wireChips(node) {
  const langChip = node.querySelector('#chip-lang');
  const muteChip = node.querySelector('#chip-mute');
  if (langChip) langChip.addEventListener('click', () => { audio.init(); toggleLang(); });
  if (muteChip) muteChip.addEventListener('click', () => {
    audio.init();
    audio.toggleMute();
    muteChip.textContent = audio.muted ? '🔇' : '🔊';
  });
}

function mount(node) {
  if (screenEl) screenEl.remove();
  screenEl = node;
  if (node) root.appendChild(node);
}

/* ---------- screens ---------- */

function renderTitle(args) {
  const best = args && args.best;
  const bestLine = best
    ? t('ui.best', { score: best.score.toLocaleString(), time: fmtTime(best.time) })
    : t('ui.noBest');
  const node = el(`
    <div class="screen">
      ${chipsHTML()}
      <div class="kicker">${t('kicker')}</div>
      <h1 class="game-title">${t('title.zh')}<span class="en">${t('title.en')}</span></h1>
      <p class="tagline">${t('tagline')}</p>
      <button class="btn" id="btn-start">${t('ui.start')} 🛵</button>
      <div class="best-line">${bestLine}</div>
      <div class="hint">${t('hint.controls')}</div>
    </div>`);
  node.querySelector('#btn-start').addEventListener('click', () => { audio.init(); handlers.onStart(); });
  wireChips(node);
  mount(node);
}

function renderSelect() {
  const cards = CHARACTERS.map((c, i) => `
    <div class="card" data-i="${i}">
      <canvas width="120" height="150"></canvas>
      <div class="cname">${pick(c.name)}</div>
      <div class="cbio">${pick(c.bio)}</div>
      <div class="stats">${['speed', 'accel', 'handling', 'shield'].map(k => `
        <div class="stat"><span class="lbl">${t('stat.' + k)}</span>
          <span class="bar"><i data-k="${k}" data-i="${i}"></i></span></div>`).join('')}
      </div>
    </div>`).join('');

  const inv = handlers.getInvincible();
  const pas = handlers.getPassenger();
  const node = el(`
    <div class="screen dim">
      ${chipsHTML()}
      <h2 class="screen-title">${t('ui.selectRider')}</h2>
      <div class="roster">${cards}</div>
      <div class="hint">${t('hint.shield')}</div>
      <div class="btn-row">
        <button class="btn-cheat ${inv ? 'on' : ''}" id="btn-inv">🛡️ ${t('ui.invincible')}：${inv ? t('ui.on') : t('ui.off')}</button>
        <button class="btn-cheat love ${pas ? 'on' : ''}" id="btn-pass">💑 ${t('ui.passenger')}：${pas ? t('ui.on') : t('ui.off')}</button>
      </div>
      <div class="hint" id="inv-desc" ${inv ? '' : 'hidden'}>${t('ui.invincibleDesc')}</div>
      <div class="hint" id="pass-desc" ${pas ? '' : 'hidden'}>${t('ui.passengerDesc')}</div>
      <button class="btn secondary" id="btn-back">${t('ui.back')}</button>
    </div>`);

  node.querySelectorAll('.card').forEach(card => {
    const i = +card.dataset.i;
    const c = CHARACTERS[i];
    const cv = card.querySelector('canvas');
    drawPortrait(cv.getContext('2d'), c, cv.width, cv.height);
    const bars = statBars(c);
    card.querySelectorAll('.stat i').forEach(bar => {
      const v = Math.max(0.08, Math.min(1, bars[bar.dataset.k]));
      bar.style.width = (v * 100).toFixed(0) + '%';
      bar.style.background = c.color;
    });
    card.addEventListener('click', () => { audio.init(); handlers.onSelect(c); });
  });
  const invBtn = node.querySelector('#btn-inv');
  invBtn.addEventListener('click', () => {
    audio.init();
    const on = handlers.onToggleInvincible();
    invBtn.classList.toggle('on', on);
    invBtn.textContent = `🛡️ ${t('ui.invincible')}：${on ? t('ui.on') : t('ui.off')}`;
    node.querySelector('#inv-desc').hidden = !on;
  });
  const passBtn = node.querySelector('#btn-pass');
  passBtn.addEventListener('click', () => {
    audio.init();
    const on = handlers.onTogglePassenger();
    passBtn.classList.toggle('on', on);
    passBtn.textContent = `💑 ${t('ui.passenger')}：${on ? t('ui.on') : t('ui.off')}`;
    node.querySelector('#pass-desc').hidden = !on;
  });
  node.querySelector('#btn-back').addEventListener('click', () => handlers.onHome());
  wireChips(node);
  mount(node);
}

function renderCountdown(args) {
  const v = args.value;
  const go = v === 'go';
  const node = el(`
    <div class="screen" style="pointer-events:none">
      <div class="count-num ${go ? 'go' : ''}">${go ? t('count.go') : v}</div>
      <div class="count-sub">${go ? t('count.goSub') : t('count.sub')}</div>
    </div>`);
  mount(node);
}

function renderPause() {
  const node = el(`
    <div class="screen dim">
      <div class="pause-panel">
        <h2 class="screen-title">${t('ui.paused')}</h2>
        <div class="btn-row">
          <button class="btn" id="btn-resume">${t('ui.resume')}</button>
          <button class="btn secondary" id="btn-restart">${t('ui.restart')}</button>
          <button class="btn secondary" id="btn-home">${t('ui.home')}</button>
        </div>
        <div class="hint">${t('hint.controls')}</div>
      </div>
    </div>`);
  node.querySelector('#btn-resume').addEventListener('click', () => handlers.onResume());
  node.querySelector('#btn-restart').addEventListener('click', () => handlers.onRestart());
  node.querySelector('#btn-home').addEventListener('click', () => handlers.onHome());
  mount(node);
}

function renderResults(args) {
  const { stats, newBest } = args;
  const node = el(`
    <div class="screen dim">
      <h2 class="screen-title">${t('ui.results')} 🎉</h2>
      <div class="rank-badge">${stats.rank}</div>
      <div class="rank-title">「${t('rank.' + stats.rank)}」</div>
      ${stats.invincible ? `<div class="inv-tag">${t('ui.invincibleTag')}</div>` : ''}
      ${newBest ? `<div class="new-best">${t('ui.newBest')}</div>` : ''}
      <div class="result-grid">
        <div class="k">${t('ui.time')}</div><div class="v">${fmtTime(stats.time)}</div>
        <div class="k">${t('ui.score')}</div><div class="v">${stats.score.toLocaleString()}</div>
        <div class="k">${t('ui.pops')}</div><div class="v">×${stats.pops}</div>
        <div class="k">${t('ui.maxCombo')}</div><div class="v">×${stats.maxCombo}</div>
        ${stats.partner ? `<div class="k">${t('ui.partner')}</div><div class="v">${stats.partner === 'left' ? t('ui.partnerLeft') : t('ui.partnerStayed')}</div>` : ''}
      </div>
      <div class="btn-row">
        <button class="btn" id="btn-again">${t('ui.again')}</button>
        <button class="btn secondary" id="btn-change">${t('ui.changeRider')}</button>
        <button class="btn secondary" id="btn-home">${t('ui.home')}</button>
      </div>
    </div>`);
  node.querySelector('#btn-again').addEventListener('click', () => handlers.onRestart());
  node.querySelector('#btn-change').addEventListener('click', () => handlers.onChangeRider());
  node.querySelector('#btn-home').addEventListener('click', () => handlers.onHome());
  mount(node);
}

const RENDERERS = {
  title: renderTitle,
  select: renderSelect,
  countdown: renderCountdown,
  pause: renderPause,
  results: renderResults,
};

function show(name, args) {
  current = { name, args };
  RENDERERS[name](args || {});
}

/* ---------- public API ---------- */

export const screens = {
  init(overlayRoot, h) {
    root = overlayRoot;
    handlers = h;
    toastEl = el(`<div id="toast"></div>`);
    root.appendChild(toastEl);
    onLangChange(() => {
      if (current) show(current.name, current.args);
    });
  },
  showTitle(best) { show('title', { best }); },
  showSelect() { show('select'); },
  showCountdown(value) { show('countdown', { value }); },
  showPause() { show('pause'); },
  showResults(stats, newBest) { show('results', { stats, newBest }); },
  hide() {
    current = null;
    mount(null);
  },
  toast(text) {
    toastEl.textContent = '📍 ' + text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
  },
};
