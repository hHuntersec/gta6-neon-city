// Neon City — configuration: world, districts, cars, missions.
// Every name, place and vehicle here is invented for this game.

export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_SPACING = 400;
export const ROAD_W = 96;
export const ROAD_HALF = ROAD_W / 2;

export const START_POS = { x: 1600, y: 1400 };

// Districts: name, rect, palette. The Neon Strip is the bright heart of the city.
export const DISTRICTS = [
  {
    id: 'strip', name: 'Neon Strip',
    x: 600, y: 1000, w: 2000, h: 400,
    ground: '#1a1030', trim: '#ff2e88', glow: '#ff2e88',
    building: ['#2a1650', '#3a1a6e', '#241040', '#4a2078'],
  },
  {
    id: 'dockside', name: 'Dockside',
    x: 0, y: 1600, w: 800, h: 800,
    ground: '#101820', trim: '#ff9f1c', glow: '#ff9f1c',
    building: ['#1c2a33', '#24363f', '#182530', '#2a3d47'],
  },
  {
    id: 'oldtown', name: 'Old Town',
    x: 0, y: 0, w: 800, h: 800,
    ground: '#1c1710', trim: '#ffd60a', glow: '#ffd60a',
    building: ['#2e2418', '#3a2f1e', '#262014', '#40331f'],
  },
  {
    id: 'uptown', name: 'Uptown Towers',
    x: 2400, y: 0, w: 800, h: 800,
    ground: '#0e1428', trim: '#00e5ff', glow: '#00e5ff',
    building: ['#182238', '#1f2c4a', '#141c30', '#26345a'],
  },
  {
    id: 'underpass', name: 'The Underpass',
    x: 2400, y: 1600, w: 800, h: 800,
    ground: '#120f16', trim: '#a855f7', glow: '#a855f7',
    building: ['#221a2e', '#2c2140', '#1c1526', '#33264a'],
  },
  {
    id: 'midtown', name: 'Midtown',
    x: 800, y: 800, w: 1600, h: 200,
    ground: '#141420', trim: '#39ff88', glow: '#39ff88',
    building: ['#20203a', '#28284a', '#1a1a30', '#2e2e55'],
  },
];

// Vehicle models. All names invented.
export const CAR_MODELS = {
  voltray: { name: 'Voltray', color: '#ff2e88', topSpeed: 430, accel: 340, grip: 2.6, health: 100 },
  nightpulse: { name: 'Nightpulse', color: '#00e5ff', topSpeed: 500, accel: 380, grip: 2.3, health: 80 },
  glowhawk: { name: 'Glowhawk', color: '#ffd60a', topSpeed: 390, accel: 300, grip: 2.9, health: 140 },
  dart: { name: 'Dart', color: '#39ff88', topSpeed: 360, accel: 300, grip: 2.5, health: 90 },
  mule: { name: 'Mule', color: '#ff9f1c', topSpeed: 300, accel: 240, grip: 2.4, health: 130 },
  interceptor: { name: 'Interceptor', color: '#2e6bff', topSpeed: 470, accel: 400, grip: 2.4, health: 120 },
};

export const PLAYER_COLORS = { jacket: '#ff2e88', pants: '#1a1a2e', skin: '#f2c89b', hair: '#00e5ff' };

export const ORB_COUNT = 20;
export const ORB_VALUE = 25;
export const RACE_REWARD = 500;
export const START_CASH = 50;

// Mission definitions. Steps drive the mission engine in missions.js.
export const MISSIONS = [
  {
    id: 'neon-run', title: 'Mission 1 — Neon Run',
    intro: 'Madame Lumen: "Vex, first delivery. Pick up the package at Dockside, bring it to the Lumen Casino on the Strip. Fast."',
    reward: 300,
    steps: [
      { type: 'goto', x: 320, y: 1800, r: 60, label: 'Pick up the package at Dockside' },
      { type: 'goto', x: 1600, y: 1400, r: 70, label: 'Deliver the package to the Lumen Casino', timeLimit: 150 },
    ],
  },
  {
    id: 'casino-chips', title: 'Mission 2 — Casino Chips',
    intro: 'Madame Lumen: "Chips went missing across the Strip. Five cases. Find them, bring them to my lounge."',
    reward: 450,
    steps: [
      {
        type: 'collect', label: 'Recover the 5 chip cases on the Strip',
        items: [
          { x: 900, y: 1000 }, { x: 1300, y: 1400 }, { x: 1700, y: 1000 },
          { x: 2100, y: 1400 }, { x: 2500, y: 1000 },
        ],
      },
      { type: 'goto', x: 1500, y: 1400, r: 70, label: 'Deliver the chips to Lumen’s lounge' },
    ],
  },
  {
    id: 'data-drop', title: 'Mission 3 — Data Drop',
    intro: 'Madame Lumen: "A data drive is waiting in Old Town. The heat will be on you — lose them and drop it at the Underpass."',
    reward: 600,
    steps: [
      { type: 'goto', x: 600, y: 400, r: 60, label: 'Pick up the data drive in Old Town' },
      { type: 'goto', x: 2800, y: 1800, r: 70, label: 'Deliver the drive to the Underpass dead drop', forceWanted: 2 },
    ],
  },
  {
    id: 'rooftop-chase', title: 'Mission 4 — Rooftop Chase',
    intro: 'Madame Lumen: "A courier is running with our ledger. Stay on his tail through Uptown until he cracks."',
    reward: 800,
    steps: [
      { type: 'chase', label: 'Stay on the courier’s tail', hold: 12, radius: 300 },
    ],
  },
  {
    id: 'neon-king', title: 'Mission 5 — The Neon King',
    intro: 'Madame Lumen: "The Neon King wants the Strip. Survive the storm, then meet me at the Dockside pier. End this."',
    reward: 1200,
    steps: [
      { type: 'survive', time: 60, label: 'Survive the storm — wanted level 5', forceWanted: 5 },
      { type: 'goto', x: 300, y: 2200, r: 80, label: 'Reach the Dockside pier extraction' },
    ],
  },
];

export const RACE_CHECKPOINTS = [
  { x: 1600, y: 200 }, { x: 2800, y: 600 }, { x: 2800, y: 1800 },
  { x: 1600, y: 2200 }, { x: 400, y: 1800 }, { x: 400, y: 600 },
];
export const RACE_START = { x: 1600, y: 1000 };

export const CLINIC_POS = { x: 620, y: 620 };
