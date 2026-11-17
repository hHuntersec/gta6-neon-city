// Neon City — world generation: road grid, district buildings, neon orbs,
// parked cars. The layout is seeded, so every run builds the same city.

import { WORLD_W, WORLD_H, ROAD_SPACING, ROAD_W, DISTRICTS, ORB_COUNT, CAR_MODELS, RACE_START } from './config.js';
import { mulberry32, pick, range } from './random.js';

export function roadXs() {
  const xs = [];
  for (let x = 200; x < WORLD_W; x += ROAD_SPACING) xs.push(x);
  return xs;
}

export function roadYs() {
  const ys = [];
  for (let y = 200; y < WORLD_H; y += ROAD_SPACING) ys.push(y);
  return ys;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[DISTRICTS.length - 1];
}

export function buildWorld() {
  const rng = mulberry32(1337);
  const buildings = [];
  const xs = roadXs();
  const ys = roadYs();

  // Blocks between roads hold 1-3 buildings, coloured by their district.
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const bx = xs[i] + ROAD_W / 2 + 14;
      const by = ys[j] + ROAD_W / 2 + 14;
      const bw = ROAD_SPACING - ROAD_W - 28;
      const bh = ROAD_SPACING - ROAD_W - 28;
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      const d = districtAt(cx, cy);
      const count = 1 + Math.floor(rng() * 3);
      for (let k = 0; k < count; k++) {
        const w = range(rng, bw * 0.28, bw * 0.62);
        const h = range(rng, bh * 0.28, bh * 0.62);
        const x = bx + range(rng, 0, Math.max(1, bw - w));
        const y = by + range(rng, 0, Math.max(1, bh - h));
        buildings.push({
          x, y, w, h,
          color: pick(rng, d.building),
          trim: d.trim,
          district: d.id,
          tall: d.id === 'uptown' && rng() < 0.6,
          sign: d.id === 'strip' && rng() < 0.75,
        });
      }
    }
  }

  // Neon orbs scattered on roads and plazas, never inside a building.
  const orbs = [];
  let guard = 0;
  while (orbs.length < ORB_COUNT && guard < 4000) {
    guard++;
    const x = range(rng, 120, WORLD_W - 120);
    const y = range(rng, 120, WORLD_H - 120);
    if (pointInBuilding(buildings, x, y, 24)) continue;
    if (orbs.some((o) => Math.hypot(o.x - x, o.y - y) < 220)) continue;
    orbs.push({ x, y, taken: false, phase: rng() * Math.PI * 2 });
  }

  // Parked cars along road edges for the player to take.
  const parked = [];
  const models = ['voltray', 'nightpulse', 'glowhawk', 'dart', 'mule'];
  for (let n = 0; n < 16; n++) {
    const vertical = rng() < 0.5;
    const road = pick(rng, vertical ? xs : ys);
    const along = range(rng, 260, (vertical ? WORLD_H : WORLD_W) - 260);
    const side = rng() < 0.5 ? -1 : 1;
    const x = vertical ? road + side * (ROAD_W / 2 - 16) : along;
    const y = vertical ? along : road + side * (ROAD_W / 2 - 16);
    const angle = vertical ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI);
    parked.push({
      model: pick(rng, models), x, y, angle,
      color: CAR_MODELS[pick(rng, models)].color,
    });
  }
  // One Voltray parked right by the player's start, so the first drive is easy.
  parked.push({ model: 'voltray', x: 1700, y: 1440, angle: 0, color: CAR_MODELS.voltray.color });

  return { buildings, orbs, parked, raceStart: RACE_START };
}

export function pointInBuilding(buildings, x, y, pad) {
  for (const b of buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return true;
  }
  return false;
}

// Push a circle (x, y, radius) out of every building it overlaps.
// Returns true when a push happened.
export function collideBuildings(buildings, body, radius) {
  let hit = false;
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        body.x = cx + (dx / d) * radius;
        body.y = cy + (dy / d) * radius;
      } else {
        body.x = b.x + b.w + radius;
      }
    }
  }
  return hit;
}

export function insideWorld(x, y) {
  return x >= 40 && x <= WORLD_W - 40 && y >= 40 && y <= WORLD_H - 40;
}
