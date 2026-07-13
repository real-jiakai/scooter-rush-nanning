# 🛵 电驴风云 · 南宁 — Scooter Rush: Nanning

**English** | [简体中文](README.zh-CN.md)

**▶ Play online: [scooter-rush-nanning.pages.dev](https://scooter-rush-nanning.pages.dev/)**

A Road Rash–style pseudo-3D racing game about Nanning's legendary electric-scooter
army (电驴大军) — minus the violence. Your scooter has a protective shield: anything
that gets too close pops in a shower of confetti and floats safely home on a balloon.
Polite overtaking, enforced by physics.

| Racing down Minzu Avenue | Finish line at Qingxiu Mountain |
| --- | --- |
| ![Racing down Minzu Avenue](docs/screenshot-race.jpg) | ![Finish line](docs/screenshot-finish.jpg) |

## Features

- **Route**: Chaoyang Square → Minzu Avenue → Zhongshan Food Street → Yongjiang Bridge → Qinghuan Road → Qingxiu Mountain
- **4 riders** with different speed / handling / shield stats — the delivery knight, the market auntie, the office worker, and the perpetually-late student
- **Shield pops** cost energy and build score combos — drain the shield and the next bump spins you out
- **Horn (Space)**: politely ask traffic to move instead of popping them
- **Invincible mode** toggle on the rider-select screen — golden infinite shield, no spin-outs (cheat runs don't count toward your best score)
- **Manhole covers**, the true final boss of Nanning roads: ride over one and the shield goes CLUNK
- **💑 Bring-your-SO mode**: a back-seat passenger is worth ×1.5 score — but every manhole makes them *instantly* angry, and at max anger they balloon home mid-race. Inspired by a real girlfriend and real manhole covers.
- Umbrella scooters, green 桂A taxis, No. 6 buses (popping one earns "BUS BOSS +500"), noodle stalls, and the 25 km/h speed-limit sign nobody obeys
- Bilingual 中文 / English UI, synthesized audio (WebAudio, no assets), best-score persistence
- **Zero dependencies** — plain HTML/CSS/JS with Canvas 2D, no build step

## Run locally

```
node serve.js   →  http://127.0.0.1:4326
```

Or serve the directory with any static file server — `serve.js` is just a
zero-dependency convenience (its `/__capture` endpoint is a dev-only debugging aid).

## Deploy

The game is fully static, so it deploys anywhere that serves files — for
**Cloudflare Pages**: connect this repo, leave the build command empty, and set the
output directory to `/`. Done.

## Controls

| Key | Action |
| --- | --- |
| ↑ / W | throttle |
| ↓ / S | brake |
| ← → / A D | steer |
| Space | horn (scatters traffic) |
| Esc / P | pause |
| M | mute |

## Acknowledgements

Built with [Claude Code](https://claude.com/claude-code), designed, written, and
play-tested by **Claude Fable 5** — from the pseudo-3D road engine to the last
老友粉 joke. 🤖
