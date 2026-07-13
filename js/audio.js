// audio.js — all sound is synthesized with WebAudio; no assets.

let ac = null;
let master = null;
let engineNodes = null;
let muted = false;

try { muted = localStorage.getItem('rush.muted') === '1'; } catch { /* ignore */ }

// The context is only ever CREATED from init() (a user gesture) — creating it
// earlier leaves it suspended with currentTime frozen, and any nodes scheduled
// against it pile up and burst all at once on the first real gesture.
function ensure() {
  if (!ac) return false;
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac.state === 'running';
}

function env(node, t0, attack, peak, decay) {
  node.gain.setValueAtTime(0.0001, t0);
  node.gain.linearRampToValueAtTime(peak, t0 + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function beep(freq, dur, type = 'square', vol = 0.2, when = 0, slide = 0) {
  if (!ensure()) return;
  const t0 = ac.currentTime + when;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  env(g, t0, 0.008, vol, dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur, vol = 0.25, when = 0, filterFreq = 2400) {
  if (!ensure()) return;
  const t0 = ac.currentTime + when;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = ac.createGain();
  env(g, t0, 0.005, vol, dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export const audio = {
  // Call from a user gesture (click / keydown) so the context is allowed to start.
  init() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return;
    }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ac.destination);
    } catch { /* no audio */ }
  },

  get muted() { return muted; },

  toggleMute() {
    muted = !muted;
    try { localStorage.setItem('rush.muted', muted ? '1' : '0'); } catch { /* ignore */ }
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  },

  engineStart() {
    if (!ensure() || engineNodes) return;
    const o1 = ac.createOscillator();
    const o2 = ac.createOscillator();
    const f = ac.createBiquadFilter();
    const g = ac.createGain();
    o1.type = 'sawtooth';
    o2.type = 'triangle';
    o1.frequency.value = 42;
    o2.frequency.value = 84;
    f.type = 'lowpass';
    f.frequency.value = 300;
    g.gain.value = 0.0;
    o1.connect(f);
    o2.connect(f);
    f.connect(g).connect(master);
    o1.start();
    o2.start();
    engineNodes = { o1, o2, f, g };
  },

  engineSet(pct) {
    if (!engineNodes) return;
    const p = Math.max(0, Math.min(1, pct));
    const t = ac.currentTime;
    engineNodes.o1.frequency.setTargetAtTime(40 + p * 75, t, 0.08);
    engineNodes.o2.frequency.setTargetAtTime(80 + p * 150, t, 0.08);
    engineNodes.g.gain.setTargetAtTime(0.02 + p * 0.075, t, 0.1);
  },

  engineStop() {
    if (!engineNodes) return;
    const { o1, o2, g } = engineNodes;
    g.gain.setTargetAtTime(0, ac.currentTime, 0.06);
    setTimeout(() => { try { o1.stop(); o2.stop(); } catch { /* already stopped */ } }, 300);
    engineNodes = null;
  },

  pop(combo = 1) {
    const c = Math.min(combo, 12);
    noise(0.09, 0.22, 0, 3200);
    beep(300 + c * 60, 0.14, 'sine', 0.22, 0, 420 + c * 60);
  },

  bigPop() {
    noise(0.25, 0.3, 0, 900);
    beep(120, 0.3, 'sine', 0.3, 0, -60);
    beep(500, 0.2, 'sine', 0.18, 0.06, 500);
  },

  crash() {
    noise(0.35, 0.32, 0, 1200);
    beep(320, 0.4, 'sawtooth', 0.2, 0, -240);
  },

  horn() {
    beep(760, 0.12, 'square', 0.16);
    beep(600, 0.14, 'square', 0.16, 0.14);
  },

  clank() {
    // metallic manhole thunk
    noise(0.06, 0.24, 0, 3400);
    beep(170, 0.1, 'square', 0.22, 0, -70);
    beep(95, 0.14, 'sawtooth', 0.16, 0.02, -30);
  },

  grumble() {
    // an unimpressed passenger
    beep(330, 0.09, 'square', 0.13);
    beep(240, 0.13, 'square', 0.13, 0.1, -50);
  },

  partnerLeave() {
    beep(640, 0.5, 'triangle', 0.18, 0, -420);
    beep(220, 0.25, 'triangle', 0.12, 0.45, -80);
  },

  hornBack(delay = 0) {
    // Distant NPC honk — quieter, random-ish pitch handled by caller varying delay.
    beep(500, 0.1, 'square', 0.05, delay);
  },

  ding() { beep(1180, 0.18, 'triangle', 0.16); },

  countdown() { beep(440, 0.15, 'square', 0.2); },

  go() { beep(880, 0.4, 'square', 0.22); },

  spinRecover() { beep(220, 0.2, 'triangle', 0.14, 0, 220); },

  finish() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((n, i) => beep(n, 0.16, 'triangle', 0.2, i * 0.12));
  },
};
