// game.js — pseudo-3D segment racer (OutRun/Road Rash technique):
// project road segments with perspective, draw back-to-front, sprites clipped
// against hill crests. World: road half-width = ROAD_W, segment = SEG_LEN.

import { t, pick, getLang } from './i18n.js';
import { audio } from './audio.js';
import { fx } from './particles.js';
import { drawPlayer } from './sprites.js';

const W = 960, H = 540;
const SEG_LEN = 200;
const ROAD_W = 1100;               // half-width, world units
const TOTAL_SEGS = 5000;           // 5.0 km displayed
const PAD_SEGS = 480;              // run-off past the finish so we never index off the end
const DRAW_DIST = 160;             // segments rendered ahead
const FOV = 100;
const CAM_H = 1150;
const CAM_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const PLAYER_Z = CAM_H * CAM_DEPTH;
const FOG_DENSITY = 3.2;
const CENTRIFUGAL = 0.24;
const UNITS_PER_KM = 200000;
const KMH = 0.0043;                // comedy speedo scale: top ≈ 58 km/h
const FINISH_SEG = TOTAL_SEGS - 55;
const FOG_COLOR = '#cfe4ec';

const ZONES = [
  { key: 'chaoyang', from: 0, to: 260, lanes: 3, grass: ['#6a6e73', '#63676c'] },
  { key: 'minzu', from: 260, to: 1400, lanes: 4, grass: ['#2f8a4a', '#2a7d42'] },
  { key: 'zhongshan', from: 1400, to: 2200, lanes: 2, grass: ['#8a7a5c', '#7f7053'] },
  { key: 'bridge', from: 2200, to: 3000, lanes: 3, grass: ['#3f7ea6', '#3a769c'] },
  { key: 'qinghuan', from: 3000, to: 4200, lanes: 2, grass: ['#2e8b57', '#28804f'] },
  { key: 'qingxiu', from: 4200, to: TOTAL_SEGS + PAD_SEGS, lanes: 2, grass: ['#276b3f', '#225f38'] },
];

function zoneAt(i) {
  for (const z of ZONES) if (i >= z.from && i < z.to) return z;
  return ZONES[ZONES.length - 1];
}

// segments with a full row of manholes across all lanes — unavoidable drama
const MANHOLE_TRIPLES = new Set([340, 760, 1180, 1650, 1950, 3260, 3720, 4420]);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t2 = Math.imul(a ^ (a >>> 15), 1 | a);
    t2 = (t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2;
    return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, p) => a + (b - a) * p;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const easeIn = (a, b, p) => a + (b - a) * p * p;
const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);

/* ================= track ================= */

function buildTrack(sprites) {
  const rnd = mulberry32(20260710);
  const segs = [];

  const lastY = () => (segs.length ? segs[segs.length - 1].p2.world.y : 0);

  function addSegment(curve, y) {
    const n = segs.length;
    const alt = Math.floor(n / 3) % 2;
    segs.push({
      index: n,
      p1: { world: { x: 0, y: lastY(), z: n * SEG_LEN }, camera: {}, screen: {} },
      p2: { world: { x: 0, y, z: (n + 1) * SEG_LEN }, camera: {}, screen: {} },
      curve,
      alt,
      sprites: [],
      carsList: null,
      carsFrame: -1,
      clip: 0,
      fog: 1,
      cross: false,
      checker: false,
      manholes: null,
    });
  }

  function addRoad(enter, hold, leave, curve, dy = 0) {
    const startY = lastY();
    const endY = startY + dy;
    const total = enter + hold + leave;
    for (let i = 0; i < enter; i++) addSegment(easeIn(0, curve, i / enter), easeInOut(startY, endY, (i + 1) / total));
    for (let i = 0; i < hold; i++) addSegment(curve, easeInOut(startY, endY, (enter + i + 1) / total));
    for (let i = 0; i < leave; i++) addSegment(easeInOut(curve, 0, i / leave), easeInOut(startY, endY, (enter + hold + i + 1) / total));
  }

  // --- 朝阳广场: flat send-off straight
  addRoad(20, 220, 20, 0, 0);
  // --- 民族大道: broad avenue, sweeping curves, gentle rolls
  addRoad(50, 100, 50, 2.2, 600);
  addRoad(40, 120, 40, 0, -400);
  addRoad(60, 120, 60, -2.8, 800);
  addRoad(40, 80, 40, 0, -600);
  addRoad(50, 140, 50, 3.0, 300);
  addRoad(30, 60, 30, 0, -300);
  // --- 中山路: tight and flat
  addRoad(40, 80, 40, -3.8, 0);
  addRoad(30, 60, 30, 0, 0);
  addRoad(40, 90, 40, 4.2, 0);
  addRoad(30, 50, 30, -4.4, 0);
  addRoad(40, 80, 40, 3.6, 0);
  addRoad(30, 60, 30, 0, 0);
  // --- 邕江大桥: climb, deck, descend
  addRoad(60, 60, 60, 1.6, 2000);
  addRoad(30, 180, 30, -1.2, 0);
  addRoad(60, 60, 60, 1.8, -2000);
  addRoad(30, 60, 30, 0, 0);
  // --- 青环路: S-curves through the green
  addRoad(50, 90, 50, -4.4, 500);
  addRoad(50, 90, 50, 4.6, -300);
  addRoad(40, 70, 40, -3.4, 600);
  addRoad(50, 90, 50, 4.2, -500);
  addRoad(40, 80, 40, -4.6, 200);
  addRoad(40, 70, 40, 2.6, 0);
  // --- 青秀山: the final climb
  addRoad(60, 90, 60, 3.4, 1400);
  addRoad(50, 80, 50, -3.8, 1200);
  addRoad(60, 100, 60, 2.8, 1600);
  addRoad(40, 200, 40, 0, 600);

  while (segs.length < TOTAL_SEGS + PAD_SEGS) addSegment(0, lastY());

  /* ---- decorate ---- */

  const addSprite = (i, sprite, offset) => {
    if (i >= 0 && i < segs.length) segs[i].sprites.push({ sprite, offset });
  };
  const pickFrom = arr => arr[(rnd() * arr.length) | 0];

  for (let i = 0; i < TOTAL_SEGS; i++) {
    const z = zoneAt(i);
    const seg = segs[i];
    seg.zone = z;

    if (z.key === 'chaoyang') {
      if (i % 9 === 3) addSprite(i, sprites.crowd, rnd() < 0.5 ? -1.65 : 1.65);
      if (i % 24 === 10) { addSprite(i, sprites.lamp, -1.3); addSprite(i, sprites.lamp, 1.3); }
      if (i % 34 === 5) addSprite(i, pickFrom(sprites.towers), (rnd() < 0.5 ? -1 : 1) * (2.6 + rnd() * 1.6));
      if (i === 60 || i === 150) seg.cross = true;
      if (i === 16 || i === 17) seg.checker = true;
    } else if (z.key === 'minzu') {
      if (i % 20 === 6) addSprite(i, sprites.palm, -1.45 - rnd() * 0.5);
      if (i % 20 === 14) addSprite(i, sprites.palm, 1.45 + rnd() * 0.5);
      if (i % 40 === 0) { addSprite(i, sprites.lamp, -1.28); addSprite(i, sprites.lamp, 1.28); }
      if (i % 46 === 22) addSprite(i, pickFrom(sprites.towers), (rnd() < 0.5 ? -1 : 1) * (2.5 + rnd() * 2));
      if (i % 130 === 60) addSprite(i, pickFrom(sprites.billboards), (rnd() < 0.5 ? -1 : 1) * 2.1);
      if (i === 420 || i === 900) addSprite(i, sprites.busStop, 1.75);
      if (i === 270) addSprite(i, sprites.gantries.minzu, 0);
    } else if (z.key === 'zhongshan') {
      if (i % 16 === 4) addSprite(i, pickFrom(sprites.stalls), -1.55 - rnd() * 0.4);
      if (i % 16 === 12) addSprite(i, pickFrom(sprites.stalls), 1.55 + rnd() * 0.4);
      if (i % 30 === 8) { addSprite(i, sprites.lamp, -1.26); addSprite(i, sprites.lamp, 1.26); }
      if (i % 110 === 40) addSprite(i, pickFrom(sprites.billboards), (rnd() < 0.5 ? -1 : 1) * 2.0);
      if (i % 120 === 70) seg.cross = true;
      if (i === 1410) addSprite(i, sprites.gantries.zhongshan, 0);
    } else if (z.key === 'bridge') {
      if (i % 3 === 0) { addSprite(i, sprites.railing, -1.32); addSprite(i, sprites.railing, 1.32); }
      if (i % 36 === 12) { addSprite(i, sprites.lamp, -1.26); addSprite(i, sprites.lamp, 1.26); }
      if (i === 2210) addSprite(i, sprites.gantries.bridge, 0);
    } else if (z.key === 'qinghuan') {
      if (i % 14 === 3) addSprite(i, rnd() < 0.6 ? sprites.palm : sprites.tree, -1.5 - rnd() * 0.9);
      if (i % 14 === 10) addSprite(i, rnd() < 0.6 ? sprites.palm : sprites.tree, 1.5 + rnd() * 0.9);
      if (i % 150 === 75) addSprite(i, pickFrom(sprites.billboards), (rnd() < 0.5 ? -1 : 1) * 2.2);
      if (i === 3010) addSprite(i, sprites.gantries.qinghuan, 0);
    } else if (z.key === 'qingxiu') {
      if (i % 10 === 2) addSprite(i, sprites.tree, -1.5 - rnd() * 0.8);
      if (i % 10 === 7) addSprite(i, sprites.tree, 1.5 + rnd() * 0.8);
      if (i % 90 === 30) addSprite(i, pickFrom(sprites.billboards), (rnd() < 0.5 ? -1 : 1) * 2.1);
      if (i === 4210) addSprite(i, sprites.gantries.qingxiu, 0);
      if (i > FINISH_SEG - 60 && i < FINISH_SEG && i % 7 === 0) {
        addSprite(i, sprites.crowd, -1.6);
        addSprite(i, sprites.crowd, 1.6);
      }
      if (i === FINISH_SEG) { addSprite(i, sprites.gantries.finish, 0); seg.checker = true; }
    }

    // 井盖 — the true final boss of Nanning roads (none on the bridge deck)
    if (z.key !== 'bridge' && i > 80 && i < FINISH_SEG - 40 && !seg.cross && !seg.checker) {
      if (MANHOLE_TRIPLES.has(i)) {
        seg.manholes = [-0.58, 0.02, 0.62];
      } else if (i % 43 === 17) {
        seg.manholes = [pickFrom([-0.6, -0.2, 0.2, 0.6]) + (rnd() * 0.08 - 0.04)];
      }
    }
  }
  for (let i = TOTAL_SEGS; i < TOTAL_SEGS + PAD_SEGS; i++) segs[i].zone = ZONES[ZONES.length - 1];

  return segs;
}

/* ================= traffic ================= */

const NPC_COUNT = 64;

const MIX = {
  chaoyang: [['scooter', 0.7], ['car', 0.1], ['bus', 0.1], ['ped', 0.1]],
  minzu: [['scooter', 0.62], ['car', 0.18], ['taxi', 0.1], ['bus', 0.1]],
  zhongshan: [['scooter', 0.42], ['ped', 0.42], ['taxi', 0.1], ['car', 0.06]],
  bridge: [['car', 0.38], ['taxi', 0.16], ['bus', 0.2], ['scooter', 0.26]],
  qinghuan: [['scooter', 0.56], ['car', 0.2], ['taxi', 0.1], ['ped', 0.14]],
  qingxiu: [['scooter', 0.6], ['car', 0.14], ['ped', 0.16], ['bus', 0.1]],
};

function pickType(zoneKey) {
  const mix = MIX[zoneKey] || MIX.minzu;
  let r = Math.random();
  for (const [type, p] of mix) {
    if (r < p) return type;
    r -= p;
  }
  return 'scooter';
}

/* ================= game factory ================= */

// The track is deterministic (fixed seed), so build it once and share it across
// restarts — rebuilding allocates ~55k objects for an identical result.
let TRACK_CACHE = null;

// Monotonic across games: segments carry carsFrame stamps, so a per-game counter
// restarting at 0 could collide with stale stamps and resurrect ghost traffic.
let frameId = 0;

export function createGame(char, sprites, hooks = {}) {
  const segments = TRACK_CACHE || (TRACK_CACHE = buildTrack(sprites));
  const INV = !!hooks.invincible;      // cheat mode: shield never drains, never breaks
  const PASSENGER = !!hooks.passenger; // your SO rides pillion: score ×1.5, manhole rage
  const trackEnd = (TOTAL_SEGS + PAD_SEGS - DRAW_DIST - 5) * SEG_LEN;
  const finishZ = FINISH_SEG * SEG_LEN;

  const g = {
    state: 'ready',          // ready | racing | finished
    demo: !!hooks.demo,
    position: 0,             // camera z
    playerX: 0,              // -1..1 across road (can go beyond, off-road)
    speed: 0,
    raceTime: 0,
    score: 0,
    pops: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    energy: char.shield.max,
    shieldOn: true,
    lastPopAt: -10,
    spinTimer: 0,
    invulnTimer: 0,
    shake: 0,
    hornCooldown: 0,
    finishedAt: 0,
    anger: 0,
    angerFlash: 0,
    partnerLeft: false,
    hopT: 0,
    prevSegIdx: null,
    time: 0,                 // global running clock (for shader-ish anims)
    parallax: 0,
    zoneKey: 'chaoyang',
    npcs: [],
  };

  function spawnNPC(npc, aheadOfZ, far = false) {
    // recycled traffic spawns deep in the fog so it never pops into view
    const z = far
      ? aheadOfZ + 18000 + Math.random() * 13000
      : aheadOfZ + 1500 + Math.random() * (DRAW_DIST * SEG_LEN * 0.85);
    const segIdx = clamp(Math.floor(z / SEG_LEN), 0, segments.length - 1);
    const type = pickType(zoneAt(segIdx).key);
    npc.type = type;
    npc.z = z;
    npc.popped = false;
    npc.respawn = 0;
    npc.scurry = 0;
    if (!npc.screen) npc.screen = { x: W / 2, y: H * 0.7, scale: 1 };
    if (type === 'scooter') {
      npc.spriteRef = sprites.scooters[(Math.random() * sprites.scooters.length) | 0];
      npc.speed = char.topSpeed * (0.3 + Math.random() * 0.24);
      npc.offset = (Math.random() * 1.7 - 0.85);
    } else if (type === 'car' || type === 'taxi') {
      npc.spriteRef = type === 'taxi' ? sprites.cars[3] : sprites.cars[(Math.random() * 3) | 0];
      npc.speed = char.topSpeed * (0.42 + Math.random() * 0.2);
      npc.offset = Math.random() < 0.5 ? -0.45 : 0.45;
    } else if (type === 'bus') {
      npc.spriteRef = sprites.bus;
      npc.speed = char.topSpeed * (0.36 + Math.random() * 0.1);
      npc.offset = Math.random() < 0.5 ? -0.5 : 0.5;
    } else { // ped
      npc.spriteRef = sprites.peds[(Math.random() * sprites.peds.length) | 0];
      npc.speed = 60 + Math.random() * 120;
      npc.offset = (Math.random() < 0.5 ? -1 : 1) * (0.75 + Math.random() * 0.45);
      npc.vx = (Math.random() < 0.4 ? -Math.sign(npc.offset) : 0) * (0.06 + Math.random() * 0.1);
    }
    npc.targetOffset = npc.offset;
    npc.driftTimer = 1 + Math.random() * 4;
  }

  for (let i = 0; i < NPC_COUNT; i++) {
    const npc = {};
    spawnNPC(npc, Math.random() * DRAW_DIST * SEG_LEN);
    g.npcs.push(npc);
  }

  const findSegment = z => segments[clamp(Math.floor(z / SEG_LEN), 0, segments.length - 1)];

  /* ---------- update ---------- */

  function popNPC(npc) {
    npc.popped = true;
    npc.respawn = 1.6 + Math.random() * 2;
    g.pops++;
    g.combo++;
    g.comboTimer = 2.6;
    g.maxCombo = Math.max(g.maxCombo, g.combo);
    g.lastPopAt = g.time;
    g.shake = Math.min(0.35, g.shake + 0.12);

    const base = { ped: 80, scooter: 100, car: 150, taxi: 180, bus: 200 }[npc.type] || 100;
    let gained = base * g.combo;
    let costMul = { ped: 0.5, scooter: 1, car: 1.3, taxi: 1.3, bus: 1.8 }[npc.type] || 1;
    if (npc.type === 'bus') gained += 500;
    if (PASSENGER && !g.partnerLeft) gained = Math.round(gained * 1.5);   // date-night bonus
    if (!g.demo) {
      g.score += gained;
      if (!INV) g.energy = Math.max(0, g.energy - char.shield.cost * costMul);
    }

    const sx = npc.screen ? npc.screen.x : W / 2;
    const sy = npc.screen ? npc.screen.y : H * 0.7;
    const sc = npc.screen ? clamp(npc.screen.scale / (CAM_DEPTH / PLAYER_Z), 0.3, 1.4) : 1;
    // confetti + balloon stay at the impact point; the TEXT goes to the corner
    // feed so it never blocks the scenery
    fx.spawnPop(sx, sy, sc);
    fx.spawnBalloon(sx, sy - 10, sc);
    if (npc.type === 'bus') {
      audio.bigPop();
      fx.feedText(t('pop.bus'), '#ffd23e');
    } else {
      audio.pop(g.combo);
      const list = t('pops.list');
      const msg = list[(Math.random() * list.length) | 0];
      fx.feedText(g.combo >= 2 ? `${msg} ×${g.combo}` : msg);
    }

    dropShieldIfEmpty();
  }

  function dropShieldIfEmpty() {
    if (!g.demo && !INV && g.energy <= 0 && g.shieldOn) {
      g.shieldOn = false;
      fx.popupText(t('shield.down'), W / 2, H * 0.42, { color: '#ff8080', size: 24 });
    }
  }

  function partnerLeaves() {
    g.partnerLeft = true;
    fx.spawnBalloon(W / 2, H - 150, 1.3);
    fx.feedText(t('anger.left', { who: pick(char.partner) }), '#ff9fb6');
    audio.partnerLeave();
  }

  function hitManhole() {
    g.shake = Math.max(g.shake, 0.3);
    g.hopT = 0.28;
    audio.clank();
    if (!INV) {
      g.energy = Math.max(0, g.energy - 8);
      dropShieldIfEmpty();
    }
    fx.feedText(t('manhole.hit'), '#c9ccd1');
    if (PASSENGER && !g.partnerLeft) {
      g.anger = Math.min(100, g.anger + 25);
      g.angerFlash = 0.9;
      audio.grumble();
      const lines = t('anger.list');
      const sep = getLang() === 'zh' ? '：' : ': ';
      fx.feedText(pick(char.partner) + sep + lines[(Math.random() * lines.length) | 0], '#ff9fb6');
      if (g.anger >= 100) partnerLeaves();
    }
  }

  function crash() {
    g.spinTimer = 1.0;
    g.invulnTimer = 1.8;
    g.speed *= 0.15;
    g.combo = 0;
    g.comboTimer = 0;
    g.shake = 0.8;
    audio.crash();
    fx.crashStars(W / 2, H - 130);
    fx.popupText(t('crash.' + ((Math.random() * 2) | 0)), W / 2, H * 0.45, { color: '#ff8080', size: 28 });
  }

  function update(dt, input) {
    g.time += dt;
    if (g.hornCooldown > 0) g.hornCooldown -= dt;
    if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 1.8);

    const playerWorldZ = g.position + PLAYER_Z;
    const playerSeg = findSegment(playerWorldZ);
    const speedPct = g.speed / char.topSpeed;

    /* --- player --- */
    const racing = g.state === 'racing';
    const canSteer = racing && g.spinTimer <= 0;

    if (g.spinTimer > 0) g.spinTimer -= dt;
    if (g.invulnTimer > 0) g.invulnTimer -= dt;

    let gas = input.gas, brake = input.brake, left = input.left, right = input.right;
    if (g.demo) {
      gas = speedPct < 0.5;
      brake = false;
      const targetX = Math.sin(g.time * 0.35) * 0.55;
      left = g.playerX > targetX + 0.05;
      right = g.playerX < targetX - 0.05;
    }

    // a back-seat passenger weighs the scooter down a little
    const hasPassenger = PASSENGER && !g.partnerLeft;
    const loadAccel = hasPassenger ? 0.92 : 1;
    const loadTop = hasPassenger ? 0.96 : 1;

    if (racing || g.demo) {
      if (gas && g.spinTimer <= 0) g.speed += char.accel * loadAccel * dt;
      else if (brake) g.speed -= 9000 * dt;
      else g.speed -= 1600 * dt;
    } else if (g.state === 'finished') {
      g.speed -= 2600 * dt;
    } else {
      g.speed = 0;
    }

    // uphill drags, downhill helps
    const slope = (playerSeg.p2.world.y - playerSeg.p1.world.y) / SEG_LEN;
    g.speed -= slope * 42000 * dt;

    // off-road
    const offroad = Math.abs(g.playerX) > 1.02;
    if (offroad && g.speed > char.topSpeed * 0.35) {
      g.speed -= 7500 * dt;
      g.shake = Math.max(g.shake, 0.12);
    }
    g.speed = clamp(g.speed, 0, char.topSpeed * loadTop);

    if (canSteer || g.demo) {
      const dx = dt * 2.0 * speedPct * char.handling;
      if (left) g.playerX -= dx;
      if (right) g.playerX += dx;
      g.playerX -= dx * speedPct * playerSeg.curve * CENTRIFUGAL;
    }
    // bridge railings are a hard edge; elsewhere you can ride the grass
    const maxX = playerSeg.zone && playerSeg.zone.key === 'bridge' ? 1.12 : 2;
    g.playerX = clamp(g.playerX, -maxX, maxX);

    g.position = clamp(g.position + g.speed * dt, 0, trackEnd);
    if (g.position >= trackEnd) g.speed = 0;
    g.parallax += playerSeg.curve * speedPct * dt * 24;

    if (racing) g.raceTime += dt;

    /* --- manhole covers --- */
    if (g.hopT > 0) g.hopT -= dt;
    if (g.angerFlash > 0) g.angerFlash -= dt;
    if (hasPassenger && g.anger > 0) g.anger = Math.max(0, g.anger - 3 * dt);

    if (racing && !g.demo) {
      // sweep every segment crossed since last frame so fast frames can't skip one
      const curIdx = clamp(Math.floor((g.position + PLAYER_Z) / SEG_LEN), 0, segments.length - 1);
      if (g.prevSegIdx === null || curIdx - g.prevSegIdx > 10 || curIdx < g.prevSegIdx) {
        g.prevSegIdx = curIdx;   // fresh start / debug warp — don't replay the gap
      } else {
        for (let idx = g.prevSegIdx + 1; idx <= curIdx; idx++) {
          const mh = segments[idx].manholes;
          if (!mh) continue;
          for (const o of mh) {
            if (Math.abs(g.playerX - o) < 0.14) { hitManhole(); break; }
          }
        }
        g.prevSegIdx = curIdx;
      }
    }

    /* --- combo & shield --- */
    if (g.comboTimer > 0) {
      g.comboTimer -= dt;
      if (g.comboTimer <= 0) g.combo = 0;
    }
    if (!g.demo && !INV) {
      if (g.time - g.lastPopAt > 0.6 && g.energy < char.shield.max) {
        g.energy = Math.min(char.shield.max, g.energy + char.shield.regen * dt);
      }
      if (!g.shieldOn && g.energy >= 30) {
        g.shieldOn = true;
        audio.ding();
        fx.popupText(t('shield.up'), W / 2, H * 0.42, { color: '#aef0ff', size: 22 });
      }
    } else {
      g.energy = char.shield.max;
      g.shieldOn = true;
    }

    /* --- horn --- */
    if (input.horn && g.hornCooldown <= 0 && (racing || g.demo)) {
      g.hornCooldown = 0.4;
      audio.horn();
      fx.popupText(t('pop.horn'), W / 2 + 60, H - 170, { color: '#ffd23e', size: 20, life: 0.6 });
      for (const npc of g.npcs) {
        const dz = npc.z - playerWorldZ;
        if (dz > 200 && dz < 7500 && Math.abs(npc.offset - g.playerX) < 0.65 && !npc.popped) {
          const away = Math.sign(npc.offset - g.playerX) || (Math.random() < 0.5 ? -1 : 1);
          if (npc.type === 'ped') {
            npc.vx = away * 0.5;
            npc.scurry = 1.2;
          } else {
            npc.targetOffset = clamp(g.playerX + away * 1.0, -0.95, 0.95);
            npc.driftTimer = 2.5;
          }
        }
      }
    }
    input.horn = false;

    /* --- traffic --- */
    for (const npc of g.npcs) {
      if (npc.popped) {
        npc.respawn -= dt;
        if (npc.respawn <= 0) spawnNPC(npc, playerWorldZ, true);
        continue;
      }
      npc.z += npc.speed * dt;

      if (npc.type === 'ped') {
        if (npc.scurry > 0) npc.scurry -= dt;
        const v = npc.vx * (npc.scurry > 0 ? 3 : 1);
        npc.offset += v * dt;
        if (npc.offset > 1.2) { npc.offset = 1.2; npc.vx = -Math.abs(npc.vx); }
        if (npc.offset < -1.2) { npc.offset = -1.2; npc.vx = Math.abs(npc.vx); }
      } else {
        npc.driftTimer -= dt;
        if (npc.driftTimer <= 0) {
          npc.driftTimer = 2 + Math.random() * 5;
          if (npc.type === 'scooter') npc.targetOffset = clamp(npc.offset + (Math.random() * 1.2 - 0.6), -0.9, 0.9);
        }
        npc.offset += clamp(npc.targetOffset - npc.offset, -0.45 * dt, 0.45 * dt);
      }

      // recycle far-behind / far-ahead traffic to keep the swarm dense
      if (npc.z < g.position - 2000 || npc.z > playerWorldZ + DRAW_DIST * SEG_LEN) {
        spawnNPC(npc, playerWorldZ, true);
        continue;
      }

      /* --- shield / collision --- */
      if ((racing || g.demo) && !npc.popped) {
        const dz = npc.z - playerWorldZ;
        const lateral = Math.abs(npc.offset - g.playerX) * ROAD_W;
        const reach = char.shield.radius + npc.spriteRef.worldW * 0.35;
        if (g.shieldOn) {
          if (dz > -300 && dz < char.shield.radius * 1.9 && lateral < reach) popNPC(npc);
        } else if (g.invulnTimer <= 0 && !g.demo) {
          if (dz > -150 && dz < 550 && lateral < 340 + npc.spriteRef.worldW * 0.3) {
            npc.popped = true;   // they wobble off; you spin out
            npc.respawn = 3;
            crash();
          }
        }
      }
    }

    /* --- zone announcements --- */
    const zk = playerSeg.zone ? playerSeg.zone.key : 'qingxiu';
    if (zk !== g.zoneKey) {
      g.zoneKey = zk;
      if (racing && hooks.onZone) {
        hooks.onZone(t('zone.' + zk));
        audio.ding();
      }
    }

    /* --- finish --- */
    if (g.demo && playerWorldZ >= finishZ) {
      g.position = 0;   // attract mode loops forever
    } else if (racing && playerWorldZ >= finishZ) {
      g.state = 'finished';
      g.finishedAt = g.time;
      audio.engineStop();
      audio.finish();
      fx.confettiRain(110);
      fx.popupText(t('finish.banner'), W / 2, H * 0.35, { color: '#ffd23e', size: 40, life: 1.6 });
    }
    if (g.state === 'finished' && g.time - g.finishedAt > 2.6 && hooks.onFinish && !g.reported) {
      g.reported = true;
      hooks.onFinish(stats());
    }

    if (racing || g.demo) audio.engineSet(speedPct);

    fx.update(dt);
  }

  function rank() {
    if (g.raceTime < 115) return 'S';
    if (g.raceTime < 140) return 'A';
    if (g.raceTime < 175) return 'B';
    return 'C';
  }

  function stats() {
    return {
      time: g.raceTime,
      score: g.score,
      pops: g.pops,
      maxCombo: g.maxCombo,
      rank: rank(),
      charId: char.id,
      invincible: INV,
      partner: PASSENGER ? (g.partnerLeft ? 'left' : 'stayed') : null,
    };
  }

  /* ---------- render ---------- */

  function project(p, camX, camY, camZ) {
    p.camera.x = p.world.x - camX;
    p.camera.y = p.world.y - camY;
    p.camera.z = p.world.z - camZ;
    p.screen.scale = CAM_DEPTH / p.camera.z;
    p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * W / 2);
    p.screen.y = Math.round(H / 2 - p.screen.scale * p.camera.y * H / 2);
    p.screen.w = Math.round(p.screen.scale * ROAD_W * W / 2);
  }

  function poly(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  function blit(ctx, spr, sx, sy, scale, clipY, fogVis) {
    const destW = spr.worldW * scale * (W / 2);
    // upper bound guards against near-zero camera z blowing a sprite up to full-screen
    if (destW < 1.5 || destW > W * 2.5) return;
    const destH = destW * (spr.c.height / spr.c.width);
    const top = sy - destH;
    const clipH = clipY ? Math.max(0, sy - clipY) : 0;
    if (clipH >= destH) return;
    ctx.globalAlpha = clamp(fogVis * 1.15, 0, 1);
    ctx.drawImage(
      spr.c,
      0, 0, spr.c.width, spr.c.height * (1 - clipH / destH),
      sx - destW / 2, top, destW, destH - clipH
    );
    ctx.globalAlpha = 1;
  }

  let skyGrad = null;

  function drawBackground(ctx) {
    // subtropical sky
    if (!skyGrad) {
      skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      skyGrad.addColorStop(0, '#4f9fd8');
      skyGrad.addColorStop(0.7, '#a8d4ea');
      skyGrad.addColorStop(1, '#e6f3ef');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.55);
    ctx.fillStyle = '#e6f3ef';
    ctx.fillRect(0, H * 0.52, W, H * 0.48);

    // sun
    ctx.fillStyle = 'rgba(255, 244, 214, 0.9)';
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.14, 30, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255, 244, 214, 0.25)';
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.14, 52, 0, 7); ctx.fill();

    // clouds (slow parallax)
    const cOff = (g.parallax * 0.12) % (W + 300);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [bx, by, s] of [[120, 60, 1], [430, 95, 0.8], [720, 50, 1.15]]) {
      const px = ((bx - cOff) % (W + 300) + (W + 300)) % (W + 300) - 150;
      ctx.beginPath();
      ctx.ellipse(px, by, 46 * s, 15 * s, 0, 0, 7);
      ctx.ellipse(px + 32 * s, by + 6 * s, 34 * s, 12 * s, 0, 0, 7);
      ctx.ellipse(px - 30 * s, by + 7 * s, 30 * s, 11 * s, 0, 0, 7);
      ctx.fill();
    }

    const horizon = H * 0.52;

    // 青秀山 ridge + 龙象塔 pagoda
    const mOff = ((g.parallax * 0.3) % 900 + 900) % 900;
    ctx.fillStyle = '#8fb8a5';
    ctx.beginPath();
    ctx.moveTo(-mOff, horizon);
    for (let i = -1; i < 3; i++) {
      const bx = i * 900 - mOff;
      ctx.quadraticCurveTo(bx + 190, horizon - 74, bx + 400, horizon - 26);
      ctx.quadraticCurveTo(bx + 560, horizon - 96, bx + 740, horizon - 30);
      ctx.quadraticCurveTo(bx + 830, horizon - 12, bx + 900, horizon);
    }
    ctx.lineTo(W + 900, horizon);
    ctx.closePath();
    ctx.fill();
    // pagoda silhouettes on the tall humps
    ctx.fillStyle = '#7da893';
    for (let i = -1; i < 3; i++) {
      const px = i * 900 - mOff + 560;
      if (px > -40 && px < W + 40) {
        for (let f = 0; f < 4; f++) {
          const fw = 26 - f * 5;
          ctx.fillRect(px - fw / 2, horizon - 96 - 10 - f * 9, fw, 7);
        }
        ctx.beginPath();
        ctx.moveTo(px, horizon - 96 - 52);
        ctx.lineTo(px - 5, horizon - 96 - 42);
        ctx.lineTo(px + 5, horizon - 96 - 42);
        ctx.closePath();
        ctx.fill();
      }
    }

    // city skyline
    const sOff = ((g.parallax * 0.6) % 700 + 700) % 700;
    ctx.fillStyle = '#9fb3c4';
    for (let i = -1; i < 3; i++) {
      const bx = i * 700 - sOff;
      const blocks = [[0, 46, 40], [60, 78, 34], [110, 58, 46], [180, 96, 30], [230, 40, 60], [310, 70, 38], [370, 52, 30], [430, 108, 26], [480, 64, 44], [560, 44, 52], [630, 84, 30]];
      for (const [ox, bh, bw] of blocks) {
        ctx.fillRect(bx + ox, horizon - bh, bw, bh);
      }
    }
    // haze line
    ctx.fillStyle = 'rgba(230, 243, 239, 0.6)';
    ctx.fillRect(0, horizon - 6, W, 10);
  }

  function drawSegmentRow(ctx, seg) {
    const p1 = seg.p1.screen, p2 = seg.p2.screen;
    const zone = seg.zone || ZONES[0];
    const grass = zone.grass[seg.alt];
    const road = seg.alt ? '#63656a' : '#606368';
    const rumble = seg.alt ? '#c9ccd1' : '#b8453f';

    ctx.fillStyle = grass;
    ctx.fillRect(0, p2.y, W, p1.y - p2.y);

    const r1 = p1.w * 0.13, r2 = p2.w * 0.13;
    poly(ctx, p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, rumble);
    poly(ctx, p1.x + p1.w + r1, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x + p2.w + r2, p2.y, rumble);
    poly(ctx, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, road);

    if (seg.checker) {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a1 = -1 + (2 * i) / n, a2 = -1 + (2 * (i + 1)) / n;
        poly(ctx,
          p1.x + p1.w * a1, p1.y, p1.x + p1.w * a2, p1.y,
          p2.x + p2.w * a2, p2.y, p2.x + p2.w * a1, p2.y,
          (i + seg.index) % 2 ? '#e8e8e8' : '#222');
      }
    } else if (seg.cross) {
      const n = 9;
      for (let i = 0; i < n; i += 2) {
        const a1 = -0.92 + (1.84 * i) / n, a2 = -0.92 + (1.84 * (i + 0.75)) / n;
        poly(ctx,
          p1.x + p1.w * a1, p1.y, p1.x + p1.w * a2, p1.y,
          p2.x + p2.w * a2, p2.y, p2.x + p2.w * a1, p2.y,
          'rgba(235,235,235,0.85)');
      }
    } else if (seg.alt === 0) {
      const lanes = zone.lanes;
      const lw1 = p1.w * 0.015, lw2 = p2.w * 0.015;
      for (let i = 1; i < lanes; i++) {
        const a = -1 + (2 * i) / lanes;
        poly(ctx,
          p1.x + p1.w * a - lw1, p1.y, p1.x + p1.w * a + lw1, p1.y,
          p2.x + p2.w * a + lw2, p2.y, p2.x + p2.w * a - lw2, p2.y,
          '#d8dade');
      }
    }

    if (seg.manholes) {
      const midY = (p1.y + p2.y) / 2;
      const ry = Math.max(1.1, (p1.y - p2.y) * 0.36);
      const rw = (p1.w + p2.w) / 2;
      for (const o of seg.manholes) {
        const rx = rw * 0.085;
        if (rx < 1.5) continue;
        const mx = (p1.x + p1.w * o + p2.x + p2.w * o) / 2;
        ctx.fillStyle = '#33363b';
        ctx.beginPath(); ctx.ellipse(mx, midY, rx, ry, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(mx, midY, rx, ry, 0, 0, 7); ctx.stroke();
        if (rx > 4) {
          ctx.strokeStyle = 'rgba(255,255,255,0.14)';
          ctx.beginPath(); ctx.ellipse(mx, midY, rx * 0.62, ry * 0.62, 0, 0, 7); ctx.stroke();
        }
      }
    }

    const fogA = 1 - seg.fog;
    if (fogA > 0.02) {
      ctx.globalAlpha = fogA;
      ctx.fillStyle = FOG_COLOR;
      ctx.fillRect(0, p2.y, W, p1.y - p2.y);
      ctx.globalAlpha = 1;
    }
  }

  function render(ctx, opts = {}) {
    const playerWorldZ = g.position + PLAYER_Z;
    const baseSeg = findSegment(g.position);
    const basePercent = (g.position % SEG_LEN) / SEG_LEN;
    const playerSeg = findSegment(playerWorldZ);
    const playerPercent = (playerWorldZ % SEG_LEN) / SEG_LEN;
    const playerY = lerp(playerSeg.p1.world.y, playerSeg.p2.world.y, playerPercent);
    const speedPct = g.speed / char.topSpeed;

    drawBackground(ctx);

    ctx.save();
    if (g.shake > 0.01) {
      ctx.translate((Math.random() * 2 - 1) * g.shake * 9, (Math.random() * 2 - 1) * g.shake * 7);
    }

    /* road pass — front to back */
    let maxy = H;
    let x = 0;
    let dx = -(baseSeg.curve * basePercent);
    const camY = playerY + CAM_H;

    for (let n = 0; n < DRAW_DIST; n++) {
      const idx = baseSeg.index + n;
      if (idx >= segments.length) break;
      const seg = segments[idx];
      seg.fog = Math.exp(-((n / DRAW_DIST) ** 2) * FOG_DENSITY);
      seg.clip = maxy;

      project(seg.p1, g.playerX * ROAD_W - x, camY, g.position);
      project(seg.p2, g.playerX * ROAD_W - x - dx, camY, g.position);
      x += dx;
      dx += seg.curve;

      if (seg.p1.camera.z <= CAM_DEPTH || seg.p2.screen.y >= maxy || seg.p2.screen.y >= seg.p1.screen.y) continue;
      drawSegmentRow(ctx, seg);
      maxy = seg.p2.screen.y;
    }

    /* NPC bucketing for this frame */
    frameId++;
    for (const npc of g.npcs) {
      if (npc.popped) continue;
      const seg = findSegment(npc.z);
      if (seg.carsFrame !== frameId) {
        if (seg.carsList) seg.carsList.length = 0;
        else seg.carsList = [];
        seg.carsFrame = frameId;
      }
      seg.carsList.push(npc);
    }

    /* sprite pass — back to front */
    for (let n = DRAW_DIST - 1; n >= 0; n--) {
      const idx = baseSeg.index + n;
      if (idx >= segments.length) continue;
      const seg = segments[idx];
      if (!seg.p1.screen.scale) continue;
      // mirror the road pass cull: p1 at/behind the camera plane projects garbage
      if (seg.p1.camera.z <= CAM_DEPTH) continue;

      for (const sp of seg.sprites) {
        const sc = seg.p1.screen.scale;
        const sx = seg.p1.screen.x + sc * sp.offset * ROAD_W * (W / 2);
        blit(ctx, sp.sprite, sx, seg.p1.screen.y, sc, seg.clip, seg.fog);
      }
      if (seg.carsFrame === frameId) {
        for (const npc of seg.carsList) {
          const p = (npc.z - seg.p1.world.z) / SEG_LEN;
          const sc = lerp(seg.p1.screen.scale, seg.p2.screen.scale || seg.p1.screen.scale, p);
          const sx = lerp(seg.p1.screen.x, seg.p2.screen.x, p) + sc * npc.offset * ROAD_W * (W / 2);
          const sy = lerp(seg.p1.screen.y, seg.p2.screen.y, p);
          npc.screen.x = sx; npc.screen.y = sy; npc.screen.scale = sc;
          blit(ctx, npc.spriteRef, sx, sy, sc, seg.clip, seg.fog);
        }
      }
    }

    /* player */
    if (!opts.hidePlayer) {
      const pScale = CAM_DEPTH / PLAYER_Z;
      const pxW = pScale * 260 * (W / 2);
      const hop = g.hopT > 0 ? -Math.sin(((0.28 - g.hopT) / 0.28) * Math.PI) * 7 : 0;
      const bounce = Math.sin(g.time * 19) * speedPct * 1.6 + (Math.abs(g.playerX) > 1.02 ? Math.sin(g.time * 47) * speedPct * 2.4 : 0) + hop;
      const lean = (input0.right ? 1 : 0) - (input0.left ? 1 : 0);
      drawPlayer(ctx, W / 2, H - 26 + bounce, pxW, char, {
        lean: g.demo ? Math.sin(g.time * 0.35) * 0.5 : lean * speedPct,
        t: g.time,
        shieldOn: g.shieldOn,
        shieldPct: g.energy / char.shield.max,
        spin: g.spinTimer > 0 ? 1 - g.spinTimer : 0,
        blink: g.invulnTimer > 0 && g.spinTimer <= 0,
        golden: INV,
        passenger: PASSENGER && !g.partnerLeft,
        partnerColor: char.partner.color,
        angerPct: g.anger / 100,
        angerFlash: g.angerFlash,
      });
    }

    ctx.restore();

    fx.draw(ctx);

    if (!g.demo && opts.hud !== false) drawHUD(ctx, speedPct);
  }

  // main.js feeds the live input here so render can lean the player without
  // threading input through render() args
  const input0 = { left: false, right: false, gas: false, brake: false };
  function setInputMirror(i) {
    input0.left = i.left; input0.right = i.right; input0.gas = i.gas; input0.brake = i.brake;
  }

  /* ---------- HUD ---------- */

  function chip(ctx, x, y, w, h, r = 10) {
    ctx.fillStyle = 'rgba(10, 15, 22, 0.62)';
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function fmtTime(s) {
    // work in tenths so 59.96s rounds to 01:00.0, not 00:60.0
    const tenths = Math.round(s * 10);
    const m = Math.floor(tenths / 600);
    const r = tenths % 600;
    return `${String(m).padStart(2, '0')}:${(r / 10).toFixed(1).padStart(4, '0')}`;
  }

  function drawHUD(ctx, speedPct) {
    ctx.textBaseline = 'middle';

    // time (top-left)
    chip(ctx, 14, 12, 128, 34);
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('⏱ ' + fmtTime(g.raceTime), 26, 30);

    // progress (top-center)
    const bw = 300, bx = W / 2 - bw / 2, by = 18;
    chip(ctx, bx - 10, by - 8, bw + 20, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(bx, by + 2, bw, 8);
    const prog = clamp((g.position + PLAYER_Z) / (FINISH_SEG * SEG_LEN), 0, 1);
    ctx.fillStyle = '#35d07f';
    ctx.fillRect(bx, by + 2, bw * prog, 8);
    for (const z of ZONES.slice(1, 6)) {
      const tx = bx + bw * (z.from / FINISH_SEG);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(tx, by, 2, 12);
    }
    // marker
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(bx + bw * prog, by + 14);
    ctx.lineTo(bx + bw * prog - 5, by + 21);
    ctx.lineTo(bx + bw * prog + 5, by + 21);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#cfe4ec';
    ctx.textAlign = 'center';
    const kmNow = Math.min(g.position + PLAYER_Z, FINISH_SEG * SEG_LEN) / UNITS_PER_KM;
    ctx.fillText(`${kmNow.toFixed(1)} / ${(FINISH_SEG * SEG_LEN / UNITS_PER_KM).toFixed(1)} ${t('hud.km')}`, W / 2, by + 28);

    // score (top-right)
    chip(ctx, W - 176, 12, 162, 34);
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffd23e';
    ctx.textAlign = 'right';
    ctx.fillText(g.score.toLocaleString(), W - 26, 30);

    // combo (under score)
    if (g.combo >= 2) {
      const flash = 0.75 + 0.25 * Math.sin(g.time * 12);
      ctx.font = 'bold 26px "Segoe UI", sans-serif';
      ctx.fillStyle = `rgba(255, 210, 62, ${flash})`;
      ctx.fillText('COMBO ×' + g.combo, W - 26, 66);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(W - 146, 80, 120, 4);
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(W - 146, 80, 120 * clamp(g.comboTimer / 2.6, 0, 1), 4);
    }

    // speedo (bottom-left)
    chip(ctx, 14, H - 92, 190, 78, 14);
    const kmh = Math.round(g.speed * KMH);
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.fillStyle = kmh > 25 ? '#ffd23e' : '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(String(kmh), 118, H - 56);
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#9fb0bc';
    ctx.textAlign = 'left';
    ctx.fillText('km/h', 126, H - 48);
    // the 25 km/h sign nobody obeys
    const signX = 168, signY = H - 62;
    ctx.beginPath(); ctx.arc(signX, signY, 17, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#d0342c';
    ctx.beginPath(); ctx.arc(signX, signY, 15, 0, 7); ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('25', signX, signY + 1);
    if (kmh > 25) {
      ctx.font = 'bold 10px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#9fb0bc';
      ctx.fillText(t('hud.limit'), signX, signY + 28);
    }

    // partner anger meter
    if (PASSENGER && !g.partnerLeft) {
      chip(ctx, 212, H - 48, 172, 34, 10);
      ctx.font = '15px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💢', 222, H - 30);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(248, H - 36, 100, 10);
      ctx.fillStyle = g.anger > 70 ? '#ff5d7a' : '#ff9fb6';
      ctx.fillRect(248, H - 36, g.anger, 10);
      ctx.fillText(g.anger < 40 ? '😊' : g.anger < 75 ? '😒' : '😡', 356, H - 30);
    }

    // shield bar
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🛡', 24, H - 26);
    const sw = 140;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(46, H - 32, sw, 10);
    if (INV) {
      const shimmer = 0.75 + 0.25 * Math.sin(g.time * 5);
      ctx.fillStyle = `rgba(255, 210, 62, ${shimmer})`;
      ctx.fillRect(46, H - 32, sw, 10);
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd23e';
      ctx.fillText('∞', 46 + sw + 8, H - 26);
    } else {
      const ep = g.energy / char.shield.max;
      ctx.fillStyle = !g.shieldOn ? '#ff5d5d' : ep > 0.4 ? '#35d07f' : '#ffd23e';
      ctx.fillRect(46, H - 32, sw * ep, 10);
      if (!g.shieldOn && Math.floor(g.time * 4) % 2 === 0) {
        ctx.font = 'bold 11px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#ff8080';
        ctx.fillText(t('shield.down'), 46 + sw + 8, H - 26);
      }
    }
  }

  /* ---------- public API ---------- */

  return {
    get state() { return g.state; },
    demo: g.demo,
    green() {
      if (g.state === 'ready') {
        g.state = 'racing';
        audio.engineStart();
      }
    },
    update(dt, input) {
      setInputMirror(input);
      update(dt, input);
    },
    render(ctx, opts) { render(ctx, opts); },
    stats,
    dispose() { audio.engineStop(); fx.clear(); },
    // debug hooks
    _debug: {
      g,
      warpToKm(km) { g.position = clamp(km * UNITS_PER_KM - PLAYER_Z, 0, trackEnd); },
      setSpeedPct(p) { g.speed = char.topSpeed * clamp(p, 0, 1); },
      segments,
    },
  };
}
