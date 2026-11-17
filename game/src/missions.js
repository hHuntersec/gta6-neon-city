// Missions: the five-job story for Madame Lumen, plus the street race.
// Each mission is a list of steps; the engine advances them as the player
// reaches markers, collects items, chases a courier or survives the storm.

import { MISSIONS, RACE_CHECKPOINTS, RACE_START, RACE_REWARD } from './config.js';
import { dist } from './random.js';
import { makeCar } from './cars.js';

export function createMissions() {
  return {
    index: 0, // mission in MISSIONS, or MISSIONS.length when the story is done
    stepIndex: 0,
    stepState: null, // per-step runtime data (collected items, chase timer...)
    stepTimer: 0,
    active: false,
    done: false,
    race: { active: false, checkpoint: 0, time: 0, best: null },
  };
}

export function startMission(G, index) {
  const m = G.missions;
  m.index = index;
  m.stepIndex = 0;
  m.active = true;
  m.done = false;
  m.stepState = freshStepState(G);
  m.stepTimer = 0;
  const def = MISSIONS[index];
  G.banner(def.title, def.intro, 6);
}

function freshStepState(G) {
  const def = MISSIONS[G.missions.index];
  if (!def) return null;
  const step = def.steps[G.missions.stepIndex];
  if (!step) return null;
  if (step.type === 'collect') return { remaining: step.items.map((it) => ({ ...it })) };
  if (step.type === 'chase') return { held: 0, car: spawnCourier(G) };
  if (step.type === 'survive') return { left: step.time };
  return {};
}

function spawnCourier(G) {
  const car = makeCar('nightpulse', 2600, 200, 0, 'target');
  car.waypoints = [
    { x: 2600, y: 200 }, { x: 2800, y: 600 }, { x: 2200, y: 600 },
    { x: 2200, y: 200 }, { x: 2800, y: 200 },
  ];
  car.waypointIndex = 0;
  car.topSpeed = 430;
  G.cars.push(car);
  return car;
}

export function currentStep(G) {
  const def = MISSIONS[G.missions.index];
  if (!def) return null;
  return def.steps[G.missions.stepIndex] || null;
}

export function currentObjective(G) {
  const m = G.missions;
  const step = currentStep(G);
  if (!m.active || !step) {
    if (m.race.active) {
      const cp = RACE_CHECKPOINTS[m.race.checkpoint];
      return { x: cp.x, y: cp.y, label: `Race checkpoint ${m.race.checkpoint + 1}/${RACE_CHECKPOINTS.length}` };
    }
    return null;
  }
  if (step.type === 'goto') return { x: step.x, y: step.y, label: step.label, radius: step.r };
  if (step.type === 'collect') {
    const next = m.stepState.remaining[0];
    if (!next) return { x: 0, y: 0, label: step.label };
    return { x: next.x, y: next.y, label: `${step.label} (${m.stepState.remaining.length} left)` };
  }
  if (step.type === 'chase') {
    const car = m.stepState.car;
    return { x: car.x, y: car.y, label: `${step.label} — held ${Math.floor(m.stepState.held)}s / ${step.hold}s` };
  }
  if (step.type === 'survive') {
    return { x: G.player.x, y: G.player.y, label: `${step.label} — ${Math.ceil(m.stepState.left)}s left` };
  }
  return null;
}

export function updateMissions(G, dt) {
  const m = G.missions;
  if (!m.active) return;
  const def = MISSIONS[m.index];
  if (!def) return;
  const step = def.steps[m.stepIndex];
  if (!step) return;
  const p = G.player;
  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;

  if (step.forceWanted !== undefined && G.wanted < step.forceWanted) {
    G.wanted = step.forceWanted;
  }
  if (step.timeLimit !== undefined) {
    m.stepTimer += dt;
    if (m.stepTimer > step.timeLimit) {
      failMission(G, 'Too slow — the deal moved on.');
      return;
    }
  }

  if (step.type === 'goto') {
    if (dist(px, py, step.x, step.y) < step.r) advanceStep(G);
  } else if (step.type === 'collect') {
    const left = m.stepState.remaining;
    for (let i = left.length - 1; i >= 0; i--) {
      if (dist(px, py, left[i].x, left[i].y) < 36) {
        left.splice(i, 1);
        G.cash += 20;
        G.audio.pickup();
        G.message('Chip case recovered! +$20', '#39ff88');
      }
    }
    if (left.length === 0) advanceStep(G);
  } else if (step.type === 'chase') {
    const car = m.stepState.car;
    if (dist(px, py, car.x, car.y) < step.radius) {
      m.stepState.held += dt;
      if (m.stepState.held >= step.hold) advanceStep(G);
    } else {
      m.stepState.held = Math.max(0, m.stepState.held - dt * 0.5);
    }
  } else if (step.type === 'survive') {
    m.stepState.left -= dt;
    if (m.stepState.left <= 0) advanceStep(G);
  }
}

function advanceStep(G) {
  const m = G.missions;
  const def = MISSIONS[m.index];
  m.stepIndex++;
  m.stepTimer = 0;
  G.audio.pickup();
  if (m.stepIndex >= def.steps.length) {
    // Mission complete.
    G.cash += def.reward;
    G.audio.missionDone();
    G.banner(`${def.title} — DONE`, `Paid $${def.reward}. Madame Lumen is pleased.`, 5);
    G.completedMissions.push(def.id);
    m.active = false;
    const next = m.index + 1;
    if (next >= MISSIONS.length) {
      m.done = true;
      G.mode = 'complete';
      G.saveGame();
    } else {
      setTimeout(() => { if (G.mode === 'playing') startMission(G, next); }, 2500);
    }
  } else {
    m.stepState = freshStepState(G);
    const step = def.steps[m.stepIndex];
    G.message(step.label, '#00e5ff');
  }
}

export function failMission(G, reason) {
  const m = G.missions;
  G.banner('Mission failed', reason, 4);
  G.audio.busted();
  m.stepIndex = 0;
  m.stepTimer = 0;
  m.stepState = freshStepState(G);
  G.message('Madame Lumen: "Again. From the top."', '#ffcc00');
}

export function restartMission(G) {
  const m = G.missions;
  if (m.index >= MISSIONS.length) return;
  m.stepIndex = 0;
  m.stepTimer = 0;
  m.stepState = freshStepState(G);
  m.active = true;
}

// Street race: drive through the start gate in a car to begin.
export function updateRace(G, dt) {
  const m = G.missions;
  const p = G.player;
  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;
  if (!m.race.active) {
    if (p.car && dist(px, py, RACE_START.x, RACE_START.y) < 46) {
      m.race.active = true;
      m.race.checkpoint = 0;
      m.race.time = 0;
      G.banner('Street Race!', 'Hit all 6 checkpoints. Fastest time wins the pot.', 4);
      G.audio.missionDone();
    }
    return;
  }
  m.race.time += dt;
  const cp = RACE_CHECKPOINTS[m.race.checkpoint];
  if (dist(px, py, cp.x, cp.y) < 70) {
    m.race.checkpoint++;
    G.audio.pickup();
    if (m.race.checkpoint >= RACE_CHECKPOINTS.length) {
      const t = m.race.time;
      const best = m.race.best === null || t < m.race.best;
      if (best) m.race.best = t;
      G.cash += RACE_REWARD;
      G.banner('Race won!', `Finished in ${t.toFixed(1)}s — $${RACE_REWARD}${best ? ' (new best!)' : ''}`, 5);
      G.audio.missionDone();
      m.race.active = false;
      G.saveGame();
    } else {
      G.message(`Checkpoint ${m.race.checkpoint}/${RACE_CHECKPOINTS.length}`, '#00e5ff');
    }
  }
}
