// Cars: driving physics, ambient traffic, police pursuit.

import { CAR_MODELS, WORLD_W, WORLD_H, ROAD_W } from './config.js';
import { clamp, angleDiff, dist } from './random.js';
import { roadXs, roadYs, collideBuildings, insideWorld } from './world.js';

let nextId = 1;

export function makeCar(model, x, y, angle, kind) {
  const spec = CAR_MODELS[model] || CAR_MODELS.dart;
  return {
    id: nextId++, model, kind: kind || 'parked', // parked | traffic | police | target
    x, y, angle, speed: 0,
    topSpeed: spec.topSpeed, accel: spec.accel, grip: spec.grip,
    health: spec.health, maxHealth: spec.health,
    color: spec.color, name: spec.name,
    owner: null, // 'player' once stolen
    // traffic state
    axis: 'v', road: 0, dir: 1, lane: 1, cruise: 0,
    arrest: 0, // police: seconds spent touching the player on foot
    waypoints: null, waypointIndex: 0,
  };
}

export function spawnTrafficCar(rng, world) {
  const xs = roadXs();
  const ys = roadYs();
  const vertical = rng() < 0.5;
  const road = vertical ? xs[Math.floor(rng() * xs.length)] : ys[Math.floor(rng() * ys.length)];
  const along = 200 + rng() * ((vertical ? WORLD_H : WORLD_W) - 400);
  const dir = rng() < 0.5 ? 1 : -1;
  const lane = rng() < 0.5 ? -1 : 1;
  const models = ['dart', 'mule', 'nightpulse', 'glowhawk'];
  const car = makeCar(models[Math.floor(rng() * models.length)],
    vertical ? road + lane * 22 : along,
    vertical ? along : road + lane * 22,
    vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    'traffic');
  car.axis = vertical ? 'v' : 'h';
  car.road = road;
  car.dir = dir;
  car.lane = lane;
  car.cruise = 130 + rng() * 90;
  return car;
}

export function spawnPoliceCar(G, x, y) {
  const car = makeCar('interceptor', x, y, 0, 'police');
  car.topSpeed = 470 + G.wanted * 6;
  return car;
}

// One traffic step: cruise along a road, sometimes turn at an intersection.
export function updateTraffic(car, dt, rng) {
  const laneOff = car.lane * 22;
  if (car.axis === 'v') {
    car.y += car.dir * car.cruise * dt;
    car.x += (car.road + laneOff - car.x) * Math.min(1, dt * 4);
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (car.y < 120) { car.dir = 1; }
    if (car.y > WORLD_H - 120) { car.dir = -1; }
    const nearX = roadYs().find((ry) => Math.abs(car.y - ry) < 6);
    if (nearX !== undefined && rng() < 0.25) {
      car.axis = 'h';
      car.road = nearX;
      car.dir = rng() < 0.5 ? 1 : -1;
      car.lane = rng() < 0.5 ? -1 : 1;
    }
  } else {
    car.x += car.dir * car.cruise * dt;
    car.y += (car.road + laneOff - car.y) * Math.min(1, dt * 4);
    car.angle = car.dir > 0 ? 0 : Math.PI;
    if (car.x < 120) { car.dir = 1; }
    if (car.x > WORLD_W - 120) { car.dir = -1; }
    const nearY = roadXs().find((rx) => Math.abs(car.x - rx) < 6);
    if (nearY !== undefined && rng() < 0.25) {
      car.axis = 'v';
      car.road = nearY;
      car.dir = rng() < 0.5 ? 1 : -1;
      car.lane = rng() < 0.5 ? -1 : 1;
    }
  }
  car.speed = car.cruise;
}

// Police chase: steer toward the player, ram the player's car, arrest on foot.
export function updatePolice(car, dt, G) {
  const p = G.player;
  const tx = p.car ? p.car.x : p.x;
  const ty = p.car ? p.car.y : p.y;
  const want = Math.atan2(ty - car.y, tx - car.x);
  const turn = clamp(angleDiff(car.angle, want), -1, 1);
  car.angle += turn * car.grip * 1.0 * dt * (0.5 + Math.min(1, Math.abs(car.speed) / 200));
  car.speed += car.accel * dt;
  if (car.speed > car.topSpeed) car.speed = car.topSpeed;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (!insideWorld(car.x, car.y)) {
    car.x = clamp(car.x, 60, WORLD_W - 60);
    car.y = clamp(car.y, 60, WORLD_H - 60);
    car.angle += Math.PI / 2;
    car.speed *= 0.5;
  }
  if (collideBuildings(G.world.buildings, car, 16)) car.speed *= 0.6;

  // Arrest: a police car touching the player on foot for 1.2s busts them.
  if (!p.car && dist(car.x, car.y, p.x, p.y) < 34) {
    car.arrest += dt;
    if (car.arrest > 1.2) {
      G.events.push({ type: 'busted' });
      car.arrest = 0;
    }
  } else {
    car.arrest = Math.max(0, car.arrest - dt * 2);
  }
}

// Waypoint driver for the mission-4 courier car.
export function updateTargetCar(car, dt) {
  if (!car.waypoints || car.waypoints.length === 0) return;
  const wp = car.waypoints[car.waypointIndex];
  const want = Math.atan2(wp.y - car.y, wp.x - car.x);
  const turn = clamp(angleDiff(car.angle, want), -1, 1);
  car.angle += turn * car.grip * 1.6 * dt;
  car.speed += car.accel * 0.8 * dt;
  if (car.speed > car.topSpeed * 0.82) car.speed = car.topSpeed * 0.82;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (dist(car.x, car.y, wp.x, wp.y) < 90) {
    car.waypointIndex = (car.waypointIndex + 1) % car.waypoints.length;
  }
}

// Player-driven car physics.
export function driveCar(car, input, dt, G) {
  const up = input.up();
  const down = input.down();
  const left = input.left();
  const right = input.right();
  if (up) car.speed += car.accel * dt;
  if (down) car.speed -= car.accel * 1.2 * dt;
  if (!up && !down) car.speed *= Math.max(0, 1 - 0.9 * dt);
  if (input.consume(' ')) car.speed *= 0.55; // handbrake
  car.speed = clamp(car.speed, -170, car.topSpeed);
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const dirSign = car.speed >= 0 ? 1 : -1;
  const steerPower = car.grip * clamp(Math.abs(car.speed) / 140, 0, 1) * dirSign;
  car.angle += steer * steerPower * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (!insideWorld(car.x, car.y)) {
    car.x = clamp(car.x, 60, WORLD_W - 60);
    car.y = clamp(car.y, 60, WORLD_H - 60);
    car.speed *= 0.4;
    G.audio.thud();
  }
  if (collideBuildings(G.world.buildings, car, 16)) {
    if (Math.abs(car.speed) > 120) {
      car.health -= 6;
      G.audio.thud();
    }
    car.speed *= 0.55;
  }
}

// Circle-circle separation between cars (simple, keeps traffic believable).
export function separateCars(cars, dt, G) {
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 34;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        if (a.kind === 'police' && b === G.player.car) {
          b.health -= 30 * dt;
          G.audio.thud();
        }
        if (b.kind === 'police' && a === G.player.car) {
          a.health -= 30 * dt;
          G.audio.thud();
        }
      }
    }
  }
}

export function carAt(cars, x, y, radius) {
  let best = null;
  let bestD = radius;
  for (const c of cars) {
    const d = dist(c.x, c.y, x, y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
