# Neon City

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/hHuntersec/gta6-neon-city/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/hHuntersec/gta6-neon-city/reward.svg)](https://make.fun/bounty/gta6-01)

**Neon City** is a 2D top-down open-world crime game for the [make.fun bounty](https://make.fun/bounty/gta6-01) — a neon-lit city you explore on foot and by car, built entirely from static files with no network requests.

You are **Vex**, a neon courier for the Strip crew run by **Madame Lumen**. The Neon King wants the Strip. Take the city back, one job at a time.

## The city

Five districts, one connected open world:

- **Neon Strip** — casino row, the bright heart of the city
- **Dockside** — warehouses and piers
- **Old Town** — narrow streets and old money
- **Uptown Towers** — glass towers and fast money
- **The Underpass** — where deals go to hide

## What is in the game

- **5-mission story** — Neon Run, Casino Chips, Data Drop, Rooftop Chase, The Neon King
- **Street races** — hit the gold race gate on the Strip, clear 6 checkpoints
- **Neon orbs** — 20 scattered across the city, +$25 each
- **Wanted level 0–5** — steal cars, hit pedestrians, run from Interceptors; the heat decays when you keep clean
- **Cars to steal and drive** — Voltray, Nightpulse, Glowhawk, Dart, Mule, plus police Interceptors
- **Traffic and pedestrians** — the city moves even when you do not
- **HUD with minimap** — cash, mission objective, wanted stars, speed, health, orbs, race timer
- **Save** — progress, cash, orbs and best race time persist in localStorage
- **Synthesized sound** — engine hum, police sirens, pickups and mission jingles, all generated in code (no audio files)

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move on foot, drive in a car |
| E | Enter / exit a car |
| Space | Punch (on foot) / handbrake (in a car) |
| Shift | Run |
| Enter | Start / continue / next job |
| Esc | Pause |
| U | Mute |

## Play it

Serve `game/` with any static server and open `index.html`, for example:

```sh
node serve.ts
# open http://localhost:8080
```

## Build

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` via the vendored `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
