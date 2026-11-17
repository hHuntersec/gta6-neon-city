// Screenshot scenes: deterministic setups for the four dossier shots.
// Used with ?shot=cover|mission|chase|night — the game starts directly in
// the scene so the screenshots show real gameplay, not a menu.

import { CAR_MODELS } from './config.js';
import { makeCar } from './cars.js';

export function applyShot(G, name) {
  const p = G.player;
  G.mode = 'playing';
  G.timeOfDay = name === 'night' || name === 'chase' ? 'night' : 'dusk';

  if (name === 'cover') {
    // Vex in a Voltray on the Neon Strip, traffic around, first job open.
    p.car = null;
    p.x = 1560;
    p.y = 1400;
    const car = makeCar('voltray', 1560, 1400, 0, 'parked');
    car.owner = 'player';
    G.cars.push(car);
    p.car = car;
    G.cash = 350;
    G.startMission(0);
    addTrafficNear(G, 1560, 1400, 4);
    return 'cover';
  }

  if (name === 'mission') {
    // Mission 2 on foot among the chip cases on the Strip.
    p.car = null;
    p.x = 1250;
    p.y = 1400;
    p.angle = 0;
    G.cash = 620;
    G.startMission(1);
    addTrafficNear(G, 1250, 1400, 3);
    return 'mission';
  }

  if (name === 'chase') {
    // Wanted 4 at night, three Interceptors on Vex's tail.
    p.car = null;
    p.x = 1500;
    p.y = 600;
    const car = makeCar('nightpulse', 1500, 600, 0, 'parked');
    car.owner = 'player';
    G.cars.push(car);
    p.car = car;
    G.cash = 940;
    G.wanted = 4;
    G.startMission(3);
    for (let i = 0; i < 3; i++) {
      const pc = makeCar('interceptor', 1500 - 160 - i * 70, 600 + (i - 1) * 60, 0, 'police');
      G.cars.push(pc);
    }
    return 'chase';
  }

  if (name === 'night') {
    // Uptown Towers at night, Vex cruising past the towers, orbs glowing.
    p.car = null;
    p.x = 2650;
    p.y = 600;
    const car = makeCar('glowhawk', 2650, 600, Math.PI / 2, 'parked');
    car.owner = 'player';
    G.cars.push(car);
    p.car = car;
    G.cash = 1180;
    G.startMission(4);
    addTrafficNear(G, 2650, 600, 4);
    return 'night';
  }

  return null;
}

function addTrafficNear(G, x, y, count) {
  const models = ['dart', 'mule', 'nightpulse', 'glowhawk'];
  const spots = [
    [x + 260, y - 40], [x - 320, y + 40], [x + 120, y + 300], [x - 80, y - 280],
    [x + 420, y + 120], [x - 480, y - 120],
  ];
  for (let i = 0; i < count; i++) {
    const s = spots[i % spots.length];
    const car = makeCar(models[i % models.length], s[0], s[1], (i % 2 === 0 ? 0 : Math.PI), 'traffic');
    car.cruise = 120 + i * 20;
    car.axis = 'h';
    car.road = s[1];
    car.dir = i % 2 === 0 ? 1 : -1;
    car.lane = 1;
    G.cars.push(car);
  }
}

// Keep the car-model names honest: every model in the game must exist.
export function modelNames() {
  return Object.keys(CAR_MODELS);
}
