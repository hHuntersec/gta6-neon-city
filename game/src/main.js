// Neon City — entry point: game state, loop, modes, wanted level, save.

import { WORLD_W, WORLD_H, DISTRICTS, MISSIONS, RACE_CHECKPOINTS, START_CASH } from './config.js';
import { buildWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer, updatePlayer, respawnAtClinic } from './player.js';
import {
  makeCar, spawnTrafficCar, spawnPoliceCar, updateTraffic, updatePolice,
  updateTargetCar, driveCar, separateCars,
} from './cars.js';
import { spawnPeds, updatePeds, checkPedHits } from './peds.js';
import {
  createMissions, startMission, updateMissions, updateRace, restartMission,
  currentObjective,
} from './missions.js';
import { drawGame } from './render.js';
import { loadSave, writeSave } from './save.js';
import { applyShot } from './shots.js';
import { clamp, dist } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const G = {
  mode: 'title',
  time: 0,
  timeOfDay: 'dusk',
  cash: START_CASH,
  wanted: 0,
  wantedTimer: 0,
  lastCrimeAt: -999,
  districts: DISTRICTS,
  missionsDef: MISSIONS,
  raceCheckpoints: RACE_CHECKPOINTS,
  completedMissions: [],
  input: createInput(),
  audio: createAudio(),
  events: [],
  camera: { x: 1600, y: 1400, zoom: 1 },
  bannerText: null,
  bannerSub: null,
  bannerUntil: 0,
  toast: null,
  toastColor: '#ffffff',
  toastUntil: 0,
  policeTimer: 0,
  hasSave: false,
};

G.world = buildWorld();
G.player = createPlayer();
G.missions = createMissions();
G.peds = spawnPeds(26);
G.cars = [];

// Parked cars from the world, then ambient traffic.
for (const pk of G.world.parked) {
  const car = makeCar(pk.model, pk.x, pk.y, pk.angle, 'parked');
  car.color = pk.color;
  G.cars.push(car);
}
for (let i = 0; i < 14; i++) {
  G.cars.push(spawnTrafficCar(Math.random, G.world));
}

G.banner = (text, sub, secs) => {
  G.bannerText = text;
  G.bannerSub = sub || '';
  G.bannerUntil = G.time + secs;
};
G.message = (text, color) => {
  G.toast = text;
  G.toastColor = color || '#ffffff';
  G.toastUntil = G.time + 3;
};
G.addWanted = (n, _reason) => {
  G.wanted = Math.min(5, G.wanted + n);
  G.lastCrimeAt = G.time;
  G.wantedTimer = 0;
};
G.startMission = (i) => startMission(G, i);
G.saveGame = () => {
  writeSave({
    cash: G.cash,
    missionIndex: Math.min(G.missions.index, MISSIONS.length - 1),
    completedMissions: G.completedMissions,
    orbsTaken: G.world.orbs.map((o) => o.taken),
    raceBest: G.missions.race.best,
  });
};

function applyLoadedSave(save) {
  G.cash = save.cash || START_CASH;
  G.completedMissions = save.completedMissions || [];
  if (Array.isArray(save.orbsTaken)) {
    save.orbsTaken.forEach((taken, i) => {
      if (taken && G.world.orbs[i]) G.world.orbs[i].taken = true;
    });
  }
  if (save.raceBest !== null && save.raceBest !== undefined) G.missions.race.best = save.raceBest;
  return save.missionIndex || 0;
}

const existingSave = loadSave();
G.hasSave = !!existingSave;

function newGame() {
  G.cash = START_CASH;
  G.completedMissions = [];
  G.world.orbs.forEach((o) => { o.taken = false; });
  G.missions.race.best = null;
  G.missions.index = 0;
  G.wanted = 0;
  G.player = createPlayer();
  G.mode = 'playing';
  G.audio.unlock();
  G.audio.startEngine();
  G.audio.startSiren();
  startMission(G, 0);
}

function continueGame() {
  if (!existingSave) return;
  const idx = applyLoadedSave(existingSave);
  G.player = createPlayer();
  G.wanted = 0;
  G.mode = 'playing';
  G.audio.unlock();
  G.audio.startEngine();
  G.audio.startSiren();
  G.missions.index = idx;
  startMission(G, idx);
  G.message('Welcome back, Vex.', '#00e5ff');
}

function maintainPolice(dt) {
  G.policeTimer -= dt;
  const police = G.cars.filter((c) => c.kind === 'police');
  if (G.wanted > 0 && police.length < Math.min(G.wanted, 4) && G.policeTimer <= 0) {
    G.policeTimer = 3;
    const p = G.player;
    const angle = Math.random() * Math.PI * 2;
    const x = clamp(p.x + Math.cos(angle) * 620, 80, WORLD_W - 80);
    const y = clamp(p.y + Math.sin(angle) * 620, 80, WORLD_H - 80);
    G.cars.push(spawnPoliceCar(G, x, y));
  }
  if (G.wanted === 0 && police.length > 0) {
    G.cars = G.cars.filter((c) => c.kind !== 'police' || dist(c.x, c.y, G.player.x, G.player.y) < 900);
  }
  // Top up ambient traffic when the player steals cars.
  const traffic = G.cars.filter((c) => c.kind === 'traffic').length;
  if (traffic < 10) G.cars.push(spawnTrafficCar(Math.random, G.world));
}

function update(dt) {
  const input = G.input;
  const p = G.player;

  // Mode keys.
  if (G.mode === 'title') {
    if (input.consume('Enter')) { newGame(); return; }
    if (input.consume('c') && G.hasSave) { continueGame(); return; }
    return;
  }
  if (G.mode === 'paused') {
    if (input.consume('Enter')) { G.mode = 'playing'; return; }
    if (input.consume('r')) { restartMission(G); G.mode = 'playing'; return; }
    if (input.consume('t')) { G.mode = 'title'; return; }
    return;
  }
  if (G.mode === 'busted' || G.mode === 'wasted') {
    if (input.consume('Enter')) {
      respawnAtClinic(G);
      restartMission(G);
      G.mode = 'playing';
    }
    return;
  }
  if (G.mode === 'complete') {
    if (input.consume('Enter')) G.mode = 'playing';
    return;
  }

  // Playing.
  if (input.consume('Escape')) { G.mode = 'paused'; return; }
  if (input.consume('u')) {
    const muted = G.audio.toggleMute();
    G.message(muted ? 'Sound off' : 'Sound on', '#b9aed6');
  }
  if (input.consume('Enter') && !G.missions.active && !G.missions.done) {
    startMission(G, G.missions.index);
  }

  G.time += dt;
  G.audio.unlock();

  if (p.car) driveCar(p.car, input, dt, G);
  updatePlayer(G, dt);
  for (const car of G.cars) {
    if (car.kind === 'traffic') updateTraffic(car, dt, Math.random);
    else if (car.kind === 'police') updatePolice(car, dt, G);
    else if (car.kind === 'target') updateTargetCar(car, dt);
  }
  separateCars(G.cars, dt, G);
  updatePeds(G, dt);
  checkPedHits(G);
  updateMissions(G, dt);
  updateRace(G, dt);

  // Neon orbs: walk or drive through one to bank it.
  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;
  for (const o of G.world.orbs) {
    if (!o.taken && dist(px, py, o.x, o.y) < 34) {
      o.taken = true;
      G.cash += 25;
      G.audio.pickup();
      G.message('Neon orb +$25', '#00e5ff');
      G.saveGame();
    }
  }

  // Wanted decays when the player keeps clean for a while.
  if (G.wanted > 0 && G.time - G.lastCrimeAt > 15) {
    G.wantedTimer += dt;
    if (G.wantedTimer > 25) {
      G.wantedTimer = 0;
      G.wanted = Math.max(0, G.wanted - 1);
      if (G.wanted === 0) G.message('The heat is off. For now.', '#39ff88');
    }
  }
  maintainPolice(dt);

  // Camera follows the player, zooming out a little at speed, and never
  // shows the void past the city's edge.
  const targetZoom = p.car ? 0.85 : 1;
  G.camera.zoom += (targetZoom - G.camera.zoom) * Math.min(1, dt * 2);
  G.camera.x += (p.x - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (p.y - G.camera.y) * Math.min(1, dt * 5);
  const vw = canvas.width / G.camera.zoom / 2;
  const vh = canvas.height / G.camera.zoom / 2;
  G.camera.x = clamp(G.camera.x, vw, WORLD_W - vw);
  G.camera.y = clamp(G.camera.y, vh, WORLD_H - vh);

  // Engine + siren follow the game state.
  const speedRatio = p.car ? Math.abs(p.car.speed) / p.car.topSpeed : 0;
  G.audio.setEngine(speedRatio, !!p.car);
  G.audio.updateSiren(dt, G.wanted);

  // Events: busted / wasted.
  while (G.events.length > 0) {
    const ev = G.events.shift();
    if (ev.type === 'busted') {
      G.cash = Math.max(0, G.cash - 100);
      G.audio.busted();
      G.mode = 'busted';
      G.saveGame();
    } else if (ev.type === 'wasted') {
      G.cash = Math.max(0, G.cash - 100);
      G.audio.busted();
      G.mode = 'wasted';
      G.saveGame();
    }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  drawGame(G, ctx, canvas.width, canvas.height);
  requestAnimationFrame(frame);
}

// Screenshot scenes (?shot=cover|mission|chase|night) start directly in play.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(G, shot);
  G.audio.unlock();
}

// Debug handle for automated play-testing (read-only state snapshot).
window.NEON = {
  game: G,
  state() {
    const p = G.player;
    const obj = currentObjective(G);
    return {
      mode: G.mode,
      time: G.time,
      cash: G.cash,
      wanted: G.wanted,
      missionIndex: G.missions.index,
      missionActive: G.missions.active,
      missionDone: G.missions.done,
      stepIndex: G.missions.stepIndex,
      objective: obj ? { x: obj.x, y: obj.y, label: obj.label } : null,
      player: {
        x: p.x, y: p.y, angle: p.angle, health: p.health,
        inCar: !!p.car, speed: p.car ? p.car.speed : 0,
        carHealth: p.car ? p.car.health : null,
        carName: p.car ? p.car.name : null,
      },
      orbsLeft: G.world.orbs.filter((o) => !o.taken).length,
      race: { active: G.missions.race.active, checkpoint: G.missions.race.checkpoint, time: G.missions.race.time },
      police: G.cars.filter((c) => c.kind === 'police').length,
      traffic: G.cars.filter((c) => c.kind === 'traffic').length,
    };
  },
};

requestAnimationFrame(frame);
