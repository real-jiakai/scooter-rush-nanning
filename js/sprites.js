// sprites.js — every visual is drawn with canvas primitives at boot and cached
// to offscreen canvases. A sprite is { c, worldW }: drawn anchored bottom-center,
// on-screen width = worldW * projectScale * (canvasWidth / 2).

function cv(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  if (draw) draw(c.getContext('2d'), w, h);
  return c;
}

function rr(x, ctx, px, py, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(px + r, py);
  ctx.arcTo(px + w, py, px + w, py + h, r);
  ctx.arcTo(px + w, py + h, px, py + h, r);
  ctx.arcTo(px, py + h, px, py, r);
  ctx.arcTo(px, py, px + w, py, r);
  ctx.closePath();
}

function roundRect(ctx, px, py, w, h, r, fill, stroke) {
  rr(null, ctx, px, py, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

/* ---------- rear-view scooter (NPC) ---------- */

function drawScooterRear(x, w, h, opt) {
  const cx = w / 2;
  // rear wheel
  x.fillStyle = '#1c1c22';
  x.beginPath(); x.ellipse(cx, h - 11, 10, 11, 0, 0, 7); x.fill();
  x.fillStyle = '#3a3a44';
  x.beginPath(); x.ellipse(cx, h - 11, 4.5, 5, 0, 0, 7); x.fill();
  // fender + body panel
  roundRect(x, cx - 17, h - 46, 34, 30, 9, opt.color);
  x.fillStyle = 'rgba(0,0,0,0.22)';
  x.fillRect(cx - 17, h - 24, 34, 8);
  // tail light
  roundRect(x, cx - 9, h - 42, 18, 7, 3, '#ff4444');
  // seat
  roundRect(x, cx - 14, h - 58, 28, 12, 6, '#23232b');
  // cargo box on rack (delivery)
  if (opt.box) {
    roundRect(x, cx - 20, h - 92, 40, 36, 6, opt.boxColor || '#ffd23e', '#00000033');
    x.fillStyle = '#333';
    x.font = 'bold 15px "Microsoft YaHei", sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(opt.boxText || '外卖', cx, h - 74);
  } else {
    // rider torso
    roundRect(x, cx - 15, h - 92, 30, 38, 10, opt.jacket);
    // arms out to mirrors
    x.strokeStyle = opt.jacket;
    x.lineWidth = 7;
    x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx - 12, h - 84); x.lineTo(cx - 26, h - 66); x.stroke();
    x.beginPath(); x.moveTo(cx + 12, h - 84); x.lineTo(cx + 26, h - 66); x.stroke();
    // helmet
    x.fillStyle = opt.helmet;
    x.beginPath(); x.arc(cx, h - 100, 12, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.28)';
    x.beginPath(); x.arc(cx - 4, h - 104, 4, 0, 7); x.fill();
  }
  // mirrors
  x.strokeStyle = '#555';
  x.lineWidth = 2.5;
  x.beginPath(); x.moveTo(cx - 24, h - 64); x.lineTo(cx - 28, h - 76); x.stroke();
  x.beginPath(); x.moveTo(cx + 24, h - 64); x.lineTo(cx + 28, h - 76); x.stroke();
  x.fillStyle = '#666';
  x.beginPath(); x.arc(cx - 28, h - 79, 3.4, 0, 7); x.fill();
  x.beginPath(); x.arc(cx + 28, h - 79, 3.4, 0, 7); x.fill();
  // the iconic Nanning sun umbrella
  if (opt.umbrella) {
    x.strokeStyle = '#888';
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx, h - 96); x.lineTo(cx, h - 128); x.stroke();
    x.fillStyle = opt.umbrellaColor || '#3aa0d8';
    x.beginPath();
    x.moveTo(cx - 34, h - 122);
    x.quadraticCurveTo(cx, h - 152, cx + 34, h - 122);
    x.quadraticCurveTo(cx, h - 132, cx - 34, h - 122);
    x.fill();
  }
}

/* ---------- other traffic ---------- */

function drawCarRear(x, w, h, color, taxi) {
  const cx = w / 2;
  // wheels
  x.fillStyle = '#15151a';
  x.fillRect(cx - 52, h - 20, 18, 18);
  x.fillRect(cx + 34, h - 20, 18, 18);
  // body
  roundRect(x, cx - 58, h - 62, 116, 52, 12, color);
  // cabin + rear window
  roundRect(x, cx - 44, h - 92, 88, 38, 12, color);
  roundRect(x, cx - 36, h - 86, 72, 26, 8, '#22303e');
  x.fillStyle = 'rgba(255,255,255,0.15)';
  x.fillRect(cx - 36, h - 86, 72, 9);
  // taillights + plate + bumper
  roundRect(x, cx - 54, h - 52, 16, 10, 3, '#ff5040');
  roundRect(x, cx + 38, h - 52, 16, 10, 3, '#ff5040');
  roundRect(x, cx - 20, h - 40, 40, 13, 3, '#e8f0dd', '#00000044');
  x.fillStyle = '#333';
  x.font = 'bold 10px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('桂A', cx, h - 33.5);
  x.fillStyle = 'rgba(0,0,0,0.25)';
  x.fillRect(cx - 58, h - 16, 116, 6);
  if (taxi) {
    roundRect(x, cx - 18, h - 106, 36, 15, 4, '#fff5cc', '#00000044');
    x.fillStyle = '#1a7d47';
    x.font = 'bold 11px "Microsoft YaHei", sans-serif';
    x.fillText('出租', cx, h - 98);
  }
}

function drawBusRear(x, w, h) {
  const cx = w / 2;
  x.fillStyle = '#15151a';
  x.fillRect(cx - 62, h - 22, 22, 22);
  x.fillRect(cx + 40, h - 22, 22, 22);
  roundRect(x, cx - 72, h - 190, 144, 178, 14, '#2e9e5b');
  // roof AC hump
  roundRect(x, cx - 50, h - 198, 100, 14, 6, '#25814a');
  // rear window
  roundRect(x, cx - 58, h - 178, 116, 54, 10, '#22303e');
  x.fillStyle = 'rgba(255,255,255,0.14)';
  x.fillRect(cx - 58, h - 178, 116, 16);
  // route board
  roundRect(x, cx - 30, h - 116, 60, 20, 4, '#111');
  x.fillStyle = '#ffb02e';
  x.font = 'bold 15px "Microsoft YaHei", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('6路', cx, h - 106);
  // ad strip
  roundRect(x, cx - 62, h - 88, 124, 34, 6, '#fdf3e3');
  x.fillStyle = '#c0392b';
  x.font = 'bold 16px "Microsoft YaHei", sans-serif';
  x.fillText('老友粉 就现在', cx, h - 71);
  // lights + plate
  roundRect(x, cx - 66, h - 46, 20, 12, 3, '#ff5040');
  roundRect(x, cx + 46, h - 46, 20, 12, 3, '#ff5040');
  roundRect(x, cx - 24, h - 44, 48, 14, 3, '#e8f0dd', '#00000044');
  x.fillStyle = '#333';
  x.font = 'bold 10px sans-serif';
  x.fillText('桂A·6路', cx, h - 37);
}

function drawPed(x, w, h, opt) {
  const cx = w / 2;
  // legs
  x.strokeStyle = '#2b3440';
  x.lineWidth = 8;
  x.lineCap = 'round';
  x.beginPath(); x.moveTo(cx - 6, h - 42); x.lineTo(cx - 7, h - 6); x.stroke();
  x.beginPath(); x.moveTo(cx + 6, h - 42); x.lineTo(cx + 7, h - 6); x.stroke();
  // torso
  roundRect(x, cx - 14, h - 80, 28, 42, 10, opt.shirt);
  // head (tilted down at phone — the universal pose)
  x.fillStyle = '#e8b98f';
  x.beginPath(); x.arc(cx + (opt.phone ? 3 : 0), h - 90, 10, 0, 7); x.fill();
  x.fillStyle = '#2b2b33';
  x.beginPath(); x.arc(cx + (opt.phone ? 3 : 0), h - 94, 9, Math.PI, 0); x.fill();
  if (opt.phone) {
    roundRect(x, cx + 8, h - 76, 9, 15, 2, '#111');
    x.fillStyle = '#9fe0ff';
    x.fillRect(cx + 9.5, h - 74.5, 6, 11);
  }
  if (opt.bag) {
    x.strokeStyle = '#a33';
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx - 14, h - 62); x.lineTo(cx - 20, h - 46); x.stroke();
    roundRect(x, cx - 28, h - 46, 16, 18, 3, '#d9534f');
    x.fillStyle = '#2e8b57';
    x.beginPath(); x.arc(cx - 22, h - 46, 4, 0, 7); x.fill(); // greens poking out
    x.beginPath(); x.arc(cx - 17, h - 47, 3.4, 0, 7); x.fill();
  }
}

/* ---------- roadside scenery ---------- */

function drawPalm(x, w, h) {
  const cx = w / 2;
  x.strokeStyle = '#8a6a42';
  x.lineWidth = 11;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(cx - 6, h - 4);
  x.quadraticCurveTo(cx + 2, h - 90, cx + 12, h - 150);
  x.stroke();
  x.strokeStyle = 'rgba(0,0,0,0.15)';
  x.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const px = cx - 6 + (18 * t);
    const py = h - 4 - (146 * t);
    x.beginPath(); x.moveTo(px - 5, py); x.lineTo(px + 5, py); x.stroke();
  }
  const tx = cx + 12, ty = h - 150;
  x.fillStyle = '#2e9e5b';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.42;
    x.save();
    x.translate(tx, ty);
    x.rotate(a);
    x.beginPath();
    x.moveTo(0, 0);
    x.quadraticCurveTo(34, -16, 66, 6);
    x.quadraticCurveTo(34, 2, 0, 8);
    x.fill();
    x.restore();
  }
  x.fillStyle = '#7a5a34';
  x.beginPath(); x.arc(tx - 4, ty + 4, 5, 0, 7); x.fill();
  x.beginPath(); x.arc(tx + 5, ty + 6, 4, 0, 7); x.fill();
}

function drawTree(x, w, h) {
  const cx = w / 2;
  x.fillStyle = '#7a5a38';
  x.fillRect(cx - 9, h - 70, 18, 68);
  const blobs = [
    [cx, h - 130, 62], [cx - 48, h - 104, 44], [cx + 48, h - 106, 46], [cx - 20, h - 158, 40], [cx + 24, h - 154, 38],
  ];
  for (const [bx, by, r] of blobs) {
    x.fillStyle = '#2f8a4d';
    x.beginPath(); x.arc(bx, by, r, 0, 7); x.fill();
  }
  for (const [bx, by, r] of blobs) {
    x.fillStyle = 'rgba(255,255,255,0.09)';
    x.beginPath(); x.arc(bx - r * 0.25, by - r * 0.3, r * 0.55, 0, 7); x.fill();
  }
}

function drawLamp(x, w, h) {
  x.strokeStyle = '#6a7482';
  x.lineWidth = 7;
  x.lineCap = 'round';
  x.beginPath(); x.moveTo(w / 2, h - 2); x.lineTo(w / 2, 24); x.stroke();
  x.lineWidth = 5;
  x.beginPath(); x.moveTo(w / 2, 26); x.quadraticCurveTo(w / 2 + 26, 22, w / 2 + 38, 30); x.stroke();
  x.fillStyle = '#ffe9a8';
  x.beginPath(); x.ellipse(w / 2 + 40, 34, 9, 6, 0, 0, 7); x.fill();
}

function drawBusStop(x, w, h) {
  // shelter
  x.fillStyle = '#5f6b7a';
  x.fillRect(14, h - 120, 8, 118);
  x.fillRect(w - 22, h - 120, 8, 118);
  roundRect(x, 4, h - 140, w - 8, 26, 8, '#2e9e5b');
  x.fillStyle = '#fff';
  x.font = 'bold 18px "Microsoft YaHei", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('公交 · 民族大道站', w / 2, h - 127);
  // ad panel
  roundRect(x, w / 2 - 46, h - 104, 92, 86, 6, '#dfe9f2', '#00000033');
  x.fillStyle = '#c0392b';
  x.font = 'bold 15px "Microsoft YaHei", sans-serif';
  x.fillText('酸嘢', w / 2, h - 82);
  x.fillStyle = '#333';
  x.font = '12px "Microsoft YaHei", sans-serif';
  x.fillText('一口一个爽', w / 2, h - 62);
  x.fillStyle = '#e67e22';
  x.beginPath(); x.arc(w / 2 - 14, h - 40, 8, 0, 7); x.fill();
  x.fillStyle = '#8bc34a';
  x.beginPath(); x.arc(w / 2 + 4, h - 38, 7, 0, 7); x.fill();
  x.fillStyle = '#ff7043';
  x.beginPath(); x.arc(w / 2 + 18, h - 42, 6, 0, 7); x.fill();
}

function drawStall(x, w, h, opt) {
  // legs + counter
  x.fillStyle = '#6b4e2e';
  x.fillRect(18, h - 60, 8, 58);
  x.fillRect(w - 26, h - 60, 8, 58);
  roundRect(x, 10, h - 66, w - 20, 26, 5, '#8a6a42');
  // pots with steam
  x.fillStyle = '#c9ccd1';
  x.beginPath(); x.ellipse(w / 2 - 24, h - 66, 14, 8, 0, 0, 7); x.fill();
  x.beginPath(); x.ellipse(w / 2 + 18, h - 66, 11, 7, 0, 0, 7); x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.55)';
  x.lineWidth = 3;
  for (const sx of [w / 2 - 28, w / 2 - 18, w / 2 + 14]) {
    x.beginPath();
    x.moveTo(sx, h - 76);
    x.quadraticCurveTo(sx + 6, h - 88, sx, h - 98);
    x.stroke();
  }
  // awning
  x.fillStyle = opt.awning;
  x.beginPath();
  x.moveTo(2, h - 118);
  x.lineTo(w - 2, h - 118);
  x.lineTo(w - 12, h - 94);
  x.lineTo(12, h - 94);
  x.closePath();
  x.fill();
  x.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 5; i++) {
    x.fillRect(6 + i * (w - 12) / 5 + 6, h - 116, (w - 12) / 10, 20);
  }
  // hanging sign
  roundRect(x, w / 2 - 40, h - 152, 80, 28, 6, '#a3231f', '#00000044');
  x.fillStyle = '#ffe9a8';
  x.font = 'bold 20px "Microsoft YaHei", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(opt.sign, w / 2, h - 137);
}

function drawBillboard(x, w, h, opt) {
  x.fillStyle = '#5f6b7a';
  x.fillRect(w * 0.28, h - 60, 10, 58);
  x.fillRect(w * 0.68, h - 60, 10, 58);
  roundRect(x, 8, h - 172, w - 16, 116, 8, opt.bg, '#00000055');
  roundRect(x, 14, h - 166, w - 28, 104, 5, 'rgba(255,255,255,0.08)');
  x.fillStyle = opt.ink;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = 'bold 26px "Microsoft YaHei", sans-serif';
  const lines = opt.lines;
  const mid = h - 172 + 58;
  if (lines.length === 1) {
    x.fillText(lines[0], w / 2, mid);
  } else {
    x.fillText(lines[0], w / 2, mid - 22);
    x.font = 'bold 20px "Microsoft YaHei", sans-serif';
    x.fillText(lines[1], w / 2, mid + 24);
  }
}

function drawTower(x, w, h, opt) {
  roundRect(x, 6, 16, w - 12, h - 18, 4, opt.body);
  // window grid
  x.fillStyle = opt.win;
  const cols = 5, rows = Math.floor((h - 60) / 26);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r * 7 + c * 3 + opt.seed) % 5 === 0) x.fillStyle = '#ffe9a8';
      else x.fillStyle = opt.win;
      x.fillRect(14 + c * (w - 24) / cols, 30 + r * 26, (w - 24) / cols - 7, 16);
    }
  }
  // rooftop
  x.fillStyle = opt.body;
  x.fillRect(w / 2 - 14, 4, 28, 14);
}

function drawCrowd(x, w, h) {
  const colors = ['#e6a23c', '#5cb8ff', '#ff8fa3', '#8ee08e', '#cf95e8', '#f2f2f2'];
  for (let i = 0; i < 9; i++) {
    const px = 14 + i * (w - 28) / 8 + ((i * 13) % 7) - 3;
    const bounce = (i % 3) * 3;
    x.fillStyle = colors[i % colors.length];
    roundRect(x, px - 8, h - 44 - bounce, 16, 30, 6, colors[i % colors.length]);
    x.fillStyle = '#e8b98f';
    x.beginPath(); x.arc(px, h - 52 - bounce, 8, 0, 7); x.fill();
    // waving arm
    x.strokeStyle = colors[(i + 2) % colors.length];
    x.lineWidth = 4;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(px + 7, h - 40 - bounce);
    x.lineTo(px + 15, h - 56 - bounce);
    x.stroke();
  }
}

function drawGantry(x, w, h, text, finish) {
  const postW = 12;
  x.fillStyle = '#5f6b7a';
  x.fillRect(6, 20, postW, h - 22);
  x.fillRect(w - 6 - postW, 20, postW, h - 22);
  const bg = finish ? '#a3231f' : '#1a7d47';
  roundRect(x, 6, 14, w - 12, 64, 8, bg, '#00000055');
  if (finish) {
    // checkered strip
    for (let i = 0; i < Math.floor(w / 16); i++) {
      x.fillStyle = i % 2 ? '#fff' : '#111';
      x.fillRect(8 + i * 16, 70, 16, 10);
    }
  }
  x.fillStyle = '#fff';
  x.font = `bold ${finish ? 34 : 30}px "Microsoft YaHei", sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, w / 2, 46);
}

/* ---------- build the atlas ---------- */

export function buildSprites() {
  const S = {};

  const scooterColors = ['#5cb8ff', '#ff8fa3', '#8ee08e', '#e6d95c', '#d8d8d8', '#ffa94d'];
  const jackets = ['#3b6ea5', '#7a4a8a', '#4d7a4d', '#8a5a3a', '#555f6b', '#a04a4a'];
  const helmets = ['#f2f2f2', '#ffd23e', '#ff6b6b', '#4dc3ff', '#c8f25c', '#ffffff'];
  S.scooters = [];
  for (let i = 0; i < 6; i++) {
    S.scooters.push({
      c: cv(96, 136, (x, w, h) => drawScooterRear(x, w, h, {
        color: scooterColors[i], jacket: jackets[i], helmet: helmets[i],
      })),
      worldW: 240,
    });
  }
  // delivery scooters (box on the rack, rider hidden behind it)
  S.scooters.push({
    c: cv(96, 136, (x, w, h) => drawScooterRear(x, w, h, {
      color: '#ffd23e', jacket: '#3b6ea5', helmet: '#ffd23e', box: true, boxText: '外卖', boxColor: '#ffd23e',
    })),
    worldW: 240,
  });
  S.scooters.push({
    c: cv(96, 136, (x, w, h) => drawScooterRear(x, w, h, {
      color: '#4dc3ff', jacket: '#3b6ea5', helmet: '#4dc3ff', box: true, boxText: '速达', boxColor: '#63c7f2',
    })),
    worldW: 240,
  });
  // umbrella scooters — peak Nanning
  S.scooters.push({
    c: cv(110, 168, (x, w, h) => drawScooterRear(x, w, h, {
      color: '#ff8fa3', jacket: '#7a4a8a', helmet: '#f2f2f2', umbrella: true, umbrellaColor: '#3aa0d8',
    })),
    worldW: 280,
  });
  S.scooters.push({
    c: cv(110, 168, (x, w, h) => drawScooterRear(x, w, h, {
      color: '#8ee08e', jacket: '#555f6b', helmet: '#ffd23e', umbrella: true, umbrellaColor: '#e66aa0',
    })),
    worldW: 280,
  });

  S.cars = [
    { c: cv(140, 100, (x, w, h) => drawCarRear(x, w, h, '#e8e8ea')), worldW: 440 },
    { c: cv(140, 100, (x, w, h) => drawCarRear(x, w, h, '#9aa3ad')), worldW: 440 },
    { c: cv(140, 100, (x, w, h) => drawCarRear(x, w, h, '#c0392b')), worldW: 440 },
    { c: cv(140, 110, (x, w, h) => drawCarRear(x, w, h, '#2e9e5b', true)), worldW: 440 }, // 桂A green taxi
  ];

  S.bus = { c: cv(160, 226, drawBusRear), worldW: 700 };

  S.peds = [
    { c: cv(64, 110, (x, w, h) => drawPed(x, w, h, { shirt: '#5cb8ff', phone: true })), worldW: 170 },
    { c: cv(64, 110, (x, w, h) => drawPed(x, w, h, { shirt: '#ff8fa3', bag: true })), worldW: 170 },
    { c: cv(64, 110, (x, w, h) => drawPed(x, w, h, { shirt: '#8ee08e', phone: true })), worldW: 170 },
    { c: cv(64, 110, (x, w, h) => drawPed(x, w, h, { shirt: '#e6d95c' })), worldW: 170 },
  ];

  S.palm = { c: cv(170, 250), worldW: 560 };
  drawPalm(S.palm.c.getContext('2d'), 170, 250);
  S.tree = { c: cv(210, 230), worldW: 700 };
  drawTree(S.tree.c.getContext('2d'), 210, 230);
  S.lamp = { c: cv(110, 260), worldW: 260 };
  drawLamp(S.lamp.c.getContext('2d'), 110, 260);
  S.busStop = { c: cv(250, 160), worldW: 820 };
  drawBusStop(S.busStop.c.getContext('2d'), 250, 160);

  S.stalls = [
    { c: cv(200, 160, (x, w, h) => drawStall(x, w, h, { awning: '#c0392b', sign: '老友粉' })), worldW: 640 },
    { c: cv(200, 160, (x, w, h) => drawStall(x, w, h, { awning: '#2e7d9e', sign: '卷筒粉' })), worldW: 640 },
    { c: cv(200, 160, (x, w, h) => drawStall(x, w, h, { awning: '#c9862b', sign: '柠檬鸭' })), worldW: 640 },
    { c: cv(200, 160, (x, w, h) => drawStall(x, w, h, { awning: '#5e8c31', sign: '糖水铺' })), worldW: 640 },
  ];

  S.billboards = [
    { c: cv(280, 180, (x, w, h) => drawBillboard(x, w, h, { bg: '#1a7d47', ink: '#fff', lines: ['绿城欢迎您', '电驴保有量：反正很多'] })), worldW: 940 },
    { c: cv(280, 180, (x, w, h) => drawBillboard(x, w, h, { bg: '#22303e', ink: '#ffd23e', lines: ['电驴限速 25', '（仅供参考）'] })), worldW: 940 },
    { c: cv(280, 180, (x, w, h) => drawBillboard(x, w, h, { bg: '#a3231f', ink: '#ffe9a8', lines: ['老友粉', '加粉不加价'] })), worldW: 940 },
    { c: cv(280, 180, (x, w, h) => drawBillboard(x, w, h, { bg: '#4a2b73', ink: '#fff', lines: ['今天，你被', '弹飞了吗？'] })), worldW: 940 },
  ];

  S.towers = [
    { c: cv(150, 420, (x, w, h) => drawTower(x, w, h, { body: '#3d4654', win: '#5a6a7d', seed: 1 })), worldW: 1500 },
    { c: cv(170, 330, (x, w, h) => drawTower(x, w, h, { body: '#4a4238', win: '#6a5f4e', seed: 2 })), worldW: 1700 },
    { c: cv(150, 480, (x, w, h) => drawTower(x, w, h, { body: '#35424e', win: '#4e6172', seed: 3 })), worldW: 1500 },
  ];

  S.crowd = { c: cv(270, 84), worldW: 860 };
  drawCrowd(S.crowd.c.getContext('2d'), 270, 84);

  S.gantries = {
    minzu: { c: cv(520, 210, (x, w, h) => drawGantry(x, w, h, '民族大道 →')), worldW: 4400 },
    zhongshan: { c: cv(520, 210, (x, w, h) => drawGantry(x, w, h, '中山路美食街')), worldW: 4400 },
    bridge: { c: cv(520, 210, (x, w, h) => drawGantry(x, w, h, '邕江大桥')), worldW: 4400 },
    qinghuan: { c: cv(520, 210, (x, w, h) => drawGantry(x, w, h, '青环路 · 绿道')), worldW: 4400 },
    qingxiu: { c: cv(520, 210, (x, w, h) => drawGantry(x, w, h, '青秀山 5A景区')), worldW: 4400 },
    finish: { c: cv(520, 210, (x, w, h) => drawGantry(x, w, h, '终点 · 青秀山', true)), worldW: 4400 },
  };

  // bridge railing segment (drawn as repeated roadside sprite)
  S.railing = {
    c: cv(140, 90, (x, w, h) => {
      x.fillStyle = '#8fa3b8';
      x.fillRect(0, h - 54, w, 10);
      x.fillRect(0, h - 20, w, 8);
      for (let i = 0; i < 5; i++) x.fillRect(6 + i * (w - 16) / 4, h - 48, 8, 36);
    }),
    worldW: 620,
  };

  return S;
}

/* ---------- the player (drawn live for lean/shield animation) ---------- */

export function drawPlayer(ctx, cx, bottomY, pxW, char, opt) {
  const { lean = 0, t = 0, shieldOn = true, shieldPct = 1, spin = 0, blink = false } = opt;
  if (blink && Math.floor(t * 10) % 2 === 0) return;

  const scale = pxW / 96;
  ctx.save();
  ctx.translate(cx, bottomY);
  if (spin > 0) {
    ctx.rotate(Math.sin(spin * Math.PI) * Math.PI * 2 * spin);
  } else {
    ctx.rotate(lean * 0.18);
  }
  ctx.scale(scale, scale);
  ctx.translate(-48, -136);

  drawScooterRear(ctx, 96, 136, { color: char.color, jacket: char.color, helmet: '#f2f2f2' });
  // trim stripe so the player pops against NPCs
  ctx.fillStyle = char.trim;
  ctx.fillRect(48 - 17, 136 - 40, 34, 5);
  ctx.restore();

  // shield bubble
  const r = pxW * 1.05;
  const cy = bottomY - pxW * 0.62;
  if (shieldOn) {
    const a = 0.16 + 0.3 * shieldPct;
    const g = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
    g.addColorStop(0, 'rgba(120, 220, 255, 0)');
    g.addColorStop(0.82, `rgba(120, 220, 255, ${a * 0.35})`);
    g.addColorStop(1, `rgba(160, 240, 255, ${a})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = `rgba(170, 240, 255, ${0.35 + 0.4 * shieldPct})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, 7);
    ctx.stroke();
    // rotating shimmer arcs
    for (let i = 0; i < 2; i++) {
      const a0 = t * 1.7 + i * Math.PI;
      ctx.strokeStyle = `rgba(255,255,255,${0.28 + 0.2 * shieldPct})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.92, 0, a0, a0 + 0.7);
      ctx.stroke();
    }
  } else {
    // sputtering dead shield
    if (Math.floor(t * 6) % 2 === 0) {
      ctx.strokeStyle = 'rgba(255, 120, 120, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.9, r * 0.82, 0, 0, 7);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/* ---------- select-screen portraits ---------- */

export function drawPortrait(ctx, char, w, h) {
  ctx.clearRect(0, 0, w, h);
  // backdrop
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, char.color + '55');
  g.addColorStop(1, char.color + '11');
  roundRect(ctx, 2, 2, w - 4, h - 4, 14, g);

  const cx = w / 2, cy = h * 0.56;
  // shoulders
  roundRect(ctx, cx - w * 0.3, cy + h * 0.12, w * 0.6, h * 0.3, 12, char.color);
  // helmet
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.06, w * 0.26, 0, 7); ctx.fill();
  ctx.fillStyle = char.trim;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.06, w * 0.26, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  // face
  ctx.fillStyle = '#e8b98f';
  ctx.beginPath(); ctx.arc(cx, cy + h * 0.02, w * 0.17, 0, 7); ctx.fill();
  // eyes + grin
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(cx - w * 0.07, cy, w * 0.025, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + w * 0.07, cy, w * 0.025, 0, 7); ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = Math.max(2, w * 0.02);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + h * 0.045, w * 0.09, 0.25, Math.PI - 0.25);
  ctx.stroke();
  // per-character accessory
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (char.id === 'waimai') {
    roundRect(ctx, w * 0.62, h * 0.62, w * 0.3, h * 0.26, 6, '#ffd23e', '#00000044');
    ctx.fillStyle = '#333';
    ctx.font = `bold ${Math.round(w * 0.13)}px "Microsoft YaHei", sans-serif`;
    ctx.fillText('外卖', w * 0.77, h * 0.75);
  } else if (char.id === 'ayi') {
    roundRect(ctx, w * 0.08, h * 0.66, w * 0.24, h * 0.2, 5, '#d9534f', '#00000044');
    ctx.fillStyle = '#2e8b57';
    ctx.beginPath(); ctx.arc(w * 0.15, h * 0.66, w * 0.05, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.24, h * 0.65, w * 0.045, 0, 7); ctx.fill();
  } else if (char.id === 'shangban') {
    ctx.fillStyle = '#1d3d5c';
    ctx.beginPath();
    ctx.moveTo(cx, cy + h * 0.18);
    ctx.lineTo(cx - w * 0.05, cy + h * 0.3);
    ctx.lineTo(cx, cy + h * 0.42);
    ctx.lineTo(cx + w * 0.05, cy + h * 0.3);
    ctx.closePath();
    ctx.fill();
  } else if (char.id === 'xuesheng') {
    ctx.strokeStyle = '#432b73';
    ctx.lineWidth = w * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.22, cy + h * 0.14);
    ctx.lineTo(cx - w * 0.16, cy + h * 0.42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.22, cy + h * 0.14);
    ctx.lineTo(cx + w * 0.16, cy + h * 0.42);
    ctx.stroke();
  }
}
