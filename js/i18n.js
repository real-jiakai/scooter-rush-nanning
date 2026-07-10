// i18n.js — zh (default) / en strings.

const STRINGS = {
  zh: {
    'kicker': '绿城限定 · 电驴大军',
    'title.zh': '电驴风云 · 南宁',
    'title.en': 'SCOOTER RUSH: NANNING',
    'tagline': '在南宁，电驴永远比你想象的多。护盾全开，礼貌超车 —— 靠太近的都会「安全弹飞」。',
    'ui.start': '开始游戏',
    'ui.selectRider': '选择你的骑手',
    'ui.back': '返回',
    'ui.resume': '继续',
    'ui.restart': '重新开始',
    'ui.home': '主菜单',
    'ui.again': '再来一次',
    'ui.changeRider': '换个骑手',
    'ui.paused': '暂停中',
    'ui.results': '到达青秀山！',
    'ui.time': '用时',
    'ui.score': '得分',
    'ui.pops': '礼貌劝返',
    'ui.maxCombo': '最高连击',
    'ui.rank': '评级',
    'ui.newBest': '★ 新纪录！',
    'ui.best': '最佳：{score} 分 · {time}',
    'ui.noBest': '还没有记录 —— 去创造历史吧',
    'hint.controls': '↑/W 加速 · ←→/AD 转向 · 空格 喇叭劝离 · P 暂停 · M 静音',
    'hint.shield': '护盾会消耗能量，能量耗尽时被撞会打滑！',
    'stat.speed': '极速',
    'stat.accel': '提速',
    'stat.handling': '灵活',
    'stat.shield': '护盾',
    'count.sub': '红灯…… 大家都在等',
    'count.go': '出发！',
    'count.goSub': '绿灯！电驴大军，冲！',
    'zone.chaoyang': '朝阳广场',
    'zone.minzu': '民族大道',
    'zone.zhongshan': '中山路美食街',
    'zone.bridge': '邕江大桥',
    'zone.qinghuan': '青环路',
    'zone.qingxiu': '青秀山',
    'hud.limit': '限速25',
    'hud.km': 'km',
    'rank.S': '南宁车神',
    'rank.A': '电驴侠',
    'rank.B': '早高峰幸存者',
    'rank.C': '安全第一好市民',
    'pop.bus': '公交霸主 +500！',
    'pop.horn': '嘀嘀——！',
    'crash.0': '哎哟喂！',
    'crash.1': '护盾没电啦！',
    'shield.down': '护盾离线…',
    'shield.up': '护盾恢复！',
    'finish.banner': '终点！',
    'pops.list': [
      'biu~',
      '已礼貌劝返',
      '安全送达路边',
      '他想起了家里的老友粉',
      '物理超车成功',
      '请勿靠近护盾',
      '已投递至人行道',
      '弹射起步！',
      '礼让行人（物理）',
      '嗦粉去了',
      '气球送客',
      '下次早点出门嘛',
    ],
  },
  en: {
    'kicker': 'GREEN CITY EDITION · SCOOTER ARMY',
    'title.zh': '电驴风云 · 南宁',
    'title.en': 'SCOOTER RUSH: NANNING',
    'tagline': "In Nanning there are always more scooters than you think. Shield up, overtake politely — anyone who gets too close is safely yeeted.",
    'ui.start': 'START',
    'ui.selectRider': 'CHOOSE YOUR RIDER',
    'ui.back': 'BACK',
    'ui.resume': 'RESUME',
    'ui.restart': 'RESTART',
    'ui.home': 'MENU',
    'ui.again': 'RACE AGAIN',
    'ui.changeRider': 'CHANGE RIDER',
    'ui.paused': 'PAUSED',
    'ui.results': 'QINGXIU SUMMIT!',
    'ui.time': 'TIME',
    'ui.score': 'SCORE',
    'ui.pops': 'POLITE POPS',
    'ui.maxCombo': 'BEST COMBO',
    'ui.rank': 'RANK',
    'ui.newBest': '★ NEW BEST!',
    'ui.best': 'Best: {score} pts · {time}',
    'ui.noBest': 'No record yet — go make history',
    'hint.controls': '↑/W gas · ←→/AD steer · SPACE horn · P pause · M mute',
    'hint.shield': 'Shield pops cost energy — run dry and the next bump spins you out!',
    'stat.speed': 'SPD',
    'stat.accel': 'ACC',
    'stat.handling': 'HDL',
    'stat.shield': 'SHD',
    'count.sub': 'Red light… everyone waits',
    'count.go': 'GO!',
    'count.goSub': 'Green light! Scooter army, CHARGE!',
    'zone.chaoyang': 'Chaoyang Square',
    'zone.minzu': 'Minzu Avenue',
    'zone.zhongshan': 'Zhongshan Food Street',
    'zone.bridge': 'Yongjiang Bridge',
    'zone.qinghuan': 'Qinghuan Road',
    'zone.qingxiu': 'Qingxiu Mountain',
    'hud.limit': 'LIMIT 25',
    'hud.km': 'km',
    'rank.S': 'Scooter God of Nanning',
    'rank.A': 'E-Rider Knight',
    'rank.B': 'Rush-hour Survivor',
    'rank.C': 'Model Safe Citizen',
    'pop.bus': 'BUS BOSS +500!',
    'pop.horn': 'BEEP BEEP!',
    'crash.0': 'Ouch!',
    'crash.1': "Shield's dead!",
    'shield.down': 'Shield offline…',
    'shield.up': 'Shield restored!',
    'finish.banner': 'FINISH!',
    'pops.list': [
      'biu~',
      'politely yeeted',
      'delivered to the curb',
      'went home for noodles',
      'physics overtake!',
      'shield says no',
      'air-mailed to safety',
      'boing!',
      'yield (physically)',
      'off to lunch',
      'balloon express',
      'leave earlier next time',
    ],
  },
};

let lang = 'zh';
try {
  const saved = localStorage.getItem('rush.lang');
  if (saved === 'en' || saved === 'zh') lang = saved;
} catch { /* storage unavailable */ }

const listeners = [];

export function t(key, vars) {
  let s = STRINGS[lang][key];
  if (s === undefined) s = STRINGS.zh[key];
  if (s === undefined) return key;
  if (typeof s === 'string' && vars) {
    for (const k of Object.keys(vars)) s = s.replaceAll('{' + k + '}', String(vars[k]));
  }
  return s;
}

export function getLang() { return lang; }

export function setLang(l) {
  if (l !== 'zh' && l !== 'en') return;
  lang = l;
  try { localStorage.setItem('rush.lang', l); } catch { /* ignore */ }
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
  for (const fn of listeners) fn(l);
}

export function toggleLang() { setLang(lang === 'zh' ? 'en' : 'zh'); }

export function onLangChange(fn) { listeners.push(fn); }

// Convenience for per-character bilingual fields: {zh:'…', en:'…'}
export function pick(obj) { return obj[lang] !== undefined ? obj[lang] : obj.zh; }
