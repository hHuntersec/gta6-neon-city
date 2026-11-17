// The player: Vex, neon courier. On foot or behind the wheel.

import { START_POS, CLINIC_POS } from './config.js';
import { clamp, dist } from './random.js';
import { collideBuildings, insideWorld } from './world.js';
import { carAt } from './cars.js';

export function createPlayer() {
  return {
    x: START_POS.x, y: START_POS.y, angle: -Math.PI / 2,
    vx: 0, vy: 0,
    health: 100, maxHealth: 100,
    car: null,
    punchCooldown: 0,
    punchAnim: 0,
  };
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;

  if (p.car) {
    // Driving: physics live in cars.js; the player rides along.
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    if (p.car.health <= 0) {
      // Wrecked: thrown out on foot, the car is a wreck now.
      G.message('Your ride is wrecked!', '#ff5555');
      p.car.kind = 'wreck';
      p.car.speed = 0;
      p.car = null;
      p.health = Math.max(30, p.health - 20);
      G.audio.thud();
    }
    if (input.consume('e')) exitCar(G);
  } else {
    // On foot: WASD/arrows to walk, Shift to run, Space to punch.
    let mx = (input.right() ? 1 : 0) - (input.left() ? 1 : 0);
    let my = (input.down() ? 1 : 0) - (input.up() ? 1 : 0);
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len;
      my /= len;
      p.angle = Math.atan2(my, mx);
    }
    const speed = input.run() ? 300 : 205;
    p.vx += (mx * speed - p.vx) * Math.min(1, dt * 10);
    p.vy += (my * speed - p.vy) * Math.min(1, dt * 10);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (!insideWorld(p.x, p.y)) {
      p.x = clamp(p.x, 60, 3200 - 60);
      p.y = clamp(p.y, 60, 2400 - 60);
    }
    collideBuildings(G.world.buildings, p, 12);

    if (input.consume('e')) enterCar(G);
    if (input.consume(' ') && p.punchCooldown <= 0) punch(G);
  }

  p.punchCooldown = Math.max(0, p.punchCooldown - dt);
  p.punchAnim = Math.max(0, p.punchAnim - dt * 3);

  // Hurt by fast traffic while on foot.
  if (!p.car) {
    for (const c of G.cars) {
      if (c.kind === 'traffic' && Math.abs(c.speed) > 60 && dist(c.x, c.y, p.x, p.y) < 24) {
        p.health -= 25;
        p.x += (p.x - c.x) * 0.6;
        p.y += (p.y - c.y) * 0.6;
        G.audio.thud();
        if (p.health <= 0) G.events.push({ type: 'wasted' });
      }
    }
  }
}

function enterCar(G) {
  const p = G.player;
  const car = carAt(G.cars, p.x, p.y, 56);
  if (!car || car.kind === 'wreck') return;
  if (car.kind === 'police') {
    G.message('That one has a driver with a badge. No.', '#ffcc00');
    return;
  }
  if (car.owner !== 'player') {
    // Stealing a car with a driver in it is a crime — the driver reports it.
    // An unattended parked car is just... borrowed. No witness, no heat.
    car.owner = 'player';
    if (car.kind === 'traffic') {
      car.kind = 'parked';
      G.addWanted(1, 'car stolen');
      G.message(`Stole a ${car.name}!`, '#ffcc00');
    } else {
      G.message(`Took the ${car.name}.`, '#39ff88');
    }
  }
  car.kind = 'parked';
  p.car = car;
  G.audio.coin();
}

function exitCar(G) {
  const p = G.player;
  const car = p.car;
  p.car = null;
  p.x = car.x - Math.cos(car.angle) * 34;
  p.y = car.y - Math.sin(car.angle) * 34;
  p.angle = car.angle;
  collideBuildings(G.world.buildings, p, 12);
}

function punch(G) {
  const p = G.player;
  p.punchCooldown = 0.45;
  p.punchAnim = 1;
  G.audio.punch();
  const hx = p.x + Math.cos(p.angle) * 30;
  const hy = p.y + Math.sin(p.angle) * 30;
  for (const ped of G.peds) {
    if (dist(ped.x, ped.y, hx, hy) < 34) {
      ped.panic = 2;
      ped.x += Math.cos(p.angle) * 26;
      ped.y += Math.sin(p.angle) * 26;
      G.addWanted(1, 'assault');
      G.message('Hey! That was a person!', '#ffcc00');
      return;
    }
  }
}

export function respawnAtClinic(G) {
  const p = G.player;
  p.car = null;
  p.x = CLINIC_POS.x;
  p.y = CLINIC_POS.y;
  p.health = 100;
  p.vx = 0;
  p.vy = 0;
  G.wanted = 0;
  G.wantedTimer = 0;
  // Clear the police, they lost you at the clinic doors.
  G.cars = G.cars.filter((c) => c.kind !== 'police');
}
