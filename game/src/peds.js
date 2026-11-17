// Pedestrians: neon-city walkers on the sidewalks, with a little panic.

import { WORLD_W, WORLD_H, ROAD_W } from './config.js';
import { mulberry32, range, dist } from './random.js';
import { roadXs, roadYs, collideBuildings } from './world.js';

const PED_COLORS = ['#ff5e8a', '#4de3ff', '#ffd60a', '#a855f7', '#39ff88', '#ff9f1c', '#e8e8f0', '#7dd3fc'];

export function spawnPeds(count) {
  const rng = mulberry32(4242);
  const xs = roadXs();
  const ys = roadYs();
  const peds = [];
  for (let n = 0; n < count; n++) {
    const vertical = rng() < 0.5;
    const road = vertical ? xs[Math.floor(rng() * xs.length)] : ys[Math.floor(rng() * ys.length)];
    const along = 140 + rng() * ((vertical ? WORLD_H : WORLD_W) - 280);
    const side = rng() < 0.5 ? -1 : 1;
    const off = ROAD_W / 2 + 10 + rng() * 12;
    peds.push({
      x: vertical ? road + side * off : along,
      y: vertical ? along : road + side * off,
      angle: rng() * Math.PI * 2,
      speed: 28 + rng() * 30,
      color: PED_COLORS[Math.floor(rng() * PED_COLORS.length)],
      dir: rng() < 0.5 ? 1 : -1,
      panic: 0,
      walkPhase: rng() * Math.PI * 2,
    });
  }
  return peds;
}

export function updatePeds(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    const dPlayer = dist(ped.x, ped.y, p.car ? p.car.x : p.x, p.car ? p.car.y : p.y);
    // Panic and flee when the player's car comes close or a punch lands.
    if (dPlayer < 130 && p.car && Math.abs(p.car.speed) > 60) ped.panic = 1.2;
    if (ped.panic > 0) {
      ped.panic -= dt;
      const flee = Math.atan2(ped.y - (p.car ? p.car.y : p.y), ped.x - (p.car ? p.car.x : p.x));
      ped.x += Math.cos(flee) * 130 * dt;
      ped.y += Math.sin(flee) * 130 * dt;
      ped.angle = flee;
    } else {
      // Stroll along the sidewalk, turning at intersections.
      ped.x += Math.cos(ped.angle) * ped.speed * ped.dir * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * ped.dir * dt;
      ped.walkPhase += dt * 6;
      if (Math.random() < dt * 0.05) ped.angle += (Math.random() - 0.5) * 1.2;
    }
    if (ped.x < 60 || ped.x > WORLD_W - 60 || ped.y < 60 || ped.y > WORLD_H - 60) {
      ped.angle += Math.PI;
      ped.x = Math.max(60, Math.min(WORLD_W - 60, ped.x));
      ped.y = Math.max(60, Math.min(WORLD_H - 60, ped.y));
    }
    collideBuildings(G.world.buildings, ped, 8);
  }
}

// A car hitting a pedestrian at speed is a crime; the pedestrian is knocked down.
export function checkPedHits(G) {
  const p = G.player;
  if (!p.car || Math.abs(p.car.speed) < 80) return;
  for (const ped of G.peds) {
    if (ped.panic > 1.0) continue;
    if (dist(ped.x, ped.y, p.car.x, p.car.y) < 26) {
      ped.panic = 2.5;
      ped.x += (ped.x - p.car.x) * 0.4;
      ped.y += (ped.y - p.car.y) * 0.4;
      G.addWanted(1, 'pedestrian hit');
      G.audio.thud();
    }
  }
}
