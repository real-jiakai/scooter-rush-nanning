// characters.js — the four riders of the Nanning scooter apocalypse.
//
// topSpeed / accel are world units (segment length = 200).
// shield.radius is in world units (road half-width = 1100).

export const CHARACTERS = [
  {
    id: 'waimai',
    name: { zh: '外卖侠 · 阿豪', en: 'A-Hao the Courier' },
    bio: {
      zh: '超时一单扣五十。挡路的，都会自动飞走。',
      en: 'Every late order costs him ¥50. Obstacles remove themselves.',
    },
    color: '#ffb02e',
    trim: '#2b2b2b',
    topSpeed: 13400,
    accel: 5800,
    handling: 1.0,
    shield: { radius: 800, max: 100, cost: 20, regen: 10 },
  },
  {
    id: 'ayi',
    name: { zh: '买菜阿姨 · 秀英', en: 'Auntie Xiuying' },
    bio: {
      zh: '特价鸡蛋不等人，菜篮就是我的赛车包。',
      en: "Discount eggs wait for no one. The basket is her racing kit.",
    },
    color: '#e63946',
    trim: '#7a1f28',
    topSpeed: 11000,
    accel: 4300,
    handling: 0.92,
    shield: { radius: 1180, max: 100, cost: 13, regen: 14 },
  },
  {
    id: 'shangban',
    name: { zh: '上班族 · 小李', en: 'Xiao Li, Office Worker' },
    bio: {
      zh: '迟到第38次的边缘，今天必须打卡成功。',
      en: 'On the verge of his 38th late arrival. Today he clocks in.',
    },
    color: '#4a90d9',
    trim: '#1d3d5c',
    topSpeed: 12200,
    accel: 5000,
    handling: 1.06,
    shield: { radius: 960, max: 100, cost: 16, regen: 12 },
  },
  {
    id: 'xuesheng',
    name: { zh: '大学生 · 阿妹', en: 'A-Mei the Student' },
    bio: {
      zh: '7:59 起床，8:00 的课。物理老师说这不可能。',
      en: 'Wakes at 7:59 for an 8:00 class. Physics disagrees.',
    },
    color: '#9b5de5',
    trim: '#432b73',
    topSpeed: 12600,
    accel: 5400,
    handling: 1.16,
    shield: { radius: 880, max: 100, cost: 17, regen: 11 },
  },
];

// Normalized 0..1 bars for the select screen.
export function statBars(c) {
  return {
    speed: (c.topSpeed - 10000) / 4000,
    accel: (c.accel - 3800) / 2400,
    handling: (c.handling - 0.85) / 0.36,
    shield: (c.shield.radius - 700) / 550,
  };
}
