// Neon City — all canvas drawing: the city, cars, people, HUD, minimap,
// menus and banners. Two palettes: dusk and night.

import { WORLD_W, WORLD_H, ROAD_W } from './config.js';
import { roadXs, roadYs, districtAt } from './world.js';
import { clamp, dist } from './random.js';
import { currentObjective } from './missions.js';

const PALETTES = {
  dusk: {
    ground: '#171224', road: '#241d33', roadEdge: '#3a2f52', lane: '#5a4a7a',
    sidewalk: '#2e2444', sky: '#1b1430', text: '#f2ecff', dim: '#b9aed6',
  },
  night: {
    ground: '#0c0a18', road: '#161226', roadEdge: '#2a2140', lane: '#453a66',
    sidewalk: '#1e1830', sky: '#0a0812', text: '#eef2ff', dim: '#9d94c2',
  },
};

export function drawGame(G, ctx, cw, ch) {
  const pal = PALETTES[G.timeOfDay];
  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, cw, ch);

  const cam = G.camera;
  const zoom = cam.zoom;
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cam.x, -cam.y);

  drawGround(G, ctx, pal);
  drawRoads(G, ctx, pal);
  drawBuildings(G, ctx, pal);
  drawOrbs(G, ctx);
  drawRaceGate(G, ctx);
  drawMissionMarkers(G, ctx);
  drawCars(G, ctx);
  drawPeds(G, ctx);
  drawPlayer(G, ctx);

  ctx.restore();

  drawTargetArrow(G, ctx, cw, ch);

  drawHUD(G, ctx, cw, ch, pal);
  drawBanner(G, ctx, cw, ch, pal);
  if (G.mode === 'title') drawTitle(G, ctx, cw, ch, pal);
  if (G.mode === 'paused') drawPause(G, ctx, cw, ch, pal);
  if (G.mode === 'busted') drawEndScreen(G, ctx, cw, ch, pal, 'BUSTED', 'The police caught Vex. The Strip forgets fast.', '#2e6bff');
  if (G.mode === 'wasted') drawEndScreen(G, ctx, cw, ch, pal, 'WASTED', 'Vex is down. The clinic patches couriers up — for a price.', '#ff5555');
  if (G.mode === 'complete') drawEndScreen(G, ctx, cw, ch, pal, 'THE NEON KING FALLS', `The Strip is yours. Final take: $${G.cash}. Free roam unlocked — press Enter.`, '#ffd60a');
}

function drawGround(G, ctx, pal) {
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // District tint blocks.
  for (const d of G.districts) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }
  // District name labels on the ground.
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px sans-serif';
  for (const d of G.districts) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = d.trim;
    ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
    ctx.globalAlpha = 1;
  }
}

function drawRoads(G, ctx, pal) {
  const xs = roadXs();
  const ys = roadYs();
  ctx.fillStyle = pal.road;
  for (const x of xs) ctx.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const y of ys) ctx.fillRect(0, y - ROAD_W / 2, WORLD_W, ROAD_W);
  // Edge lines and dashed centre lines.
  ctx.strokeStyle = pal.roadEdge;
  ctx.lineWidth = 3;
  for (const x of xs) {
    ctx.beginPath(); ctx.moveTo(x - ROAD_W / 2, 0); ctx.lineTo(x - ROAD_W / 2, WORLD_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + ROAD_W / 2, 0); ctx.lineTo(x + ROAD_W / 2, WORLD_H); ctx.stroke();
  }
  for (const y of ys) {
    ctx.beginPath(); ctx.moveTo(0, y - ROAD_W / 2); ctx.lineTo(WORLD_W, y - ROAD_W / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y + ROAD_W / 2); ctx.lineTo(WORLD_W, y + ROAD_W / 2); ctx.stroke();
  }
  ctx.strokeStyle = pal.lane;
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  for (const x of xs) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
  }
  for (const y of ys) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawBuildings(G, ctx, pal) {
  for (const b of G.world.buildings) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Roof detail: inner panel.
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    // Neon trim on Strip buildings and tall Uptown towers.
    if (b.district === 'strip' || b.tall) {
      ctx.strokeStyle = b.trim;
      ctx.lineWidth = 2;
      ctx.shadowColor = b.trim;
      ctx.shadowBlur = 12;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      ctx.shadowBlur = 0;
    }
    // Casino sign glow on Strip buildings.
    if (b.sign) {
      ctx.fillStyle = '#ff2e88';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = 16;
      ctx.fillRect(b.x + b.w / 2 - 14, b.y + b.h / 2 - 4, 28, 8);
      ctx.shadowBlur = 0;
    }
    // Windows on tall towers.
    if (b.tall) {
      ctx.fillStyle = 'rgba(0,229,255,0.5)';
      const cols = Math.floor(b.w / 18);
      const rows = Math.floor(b.h / 18);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if ((i * 7 + j * 3) % 3 === 0) ctx.fillRect(b.x + 6 + i * 18, b.y + 6 + j * 18, 7, 9);
        }
      }
    }
  }
}

function drawOrbs(G, ctx) {
  const t = G.time;
  for (const o of G.world.orbs) {
    if (o.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(t * 3 + o.phase);
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 18 * pulse;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 8 + 2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(o.x, o.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRaceGate(G, ctx) {
  const s = G.world.raceStart;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.strokeStyle = G.missions.race.active ? '#39ff88' : '#ffd60a';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RACE', 0, -52);
  ctx.restore();
}

function drawMissionMarkers(G, ctx) {
  const obj = currentObjective(G);
  if (!obj || obj.x === undefined) return;
  const pulse = 0.6 + 0.4 * Math.sin(G.time * 4);
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#ffd60a';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 0, 26 + 6 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Downward beacon.
  ctx.fillStyle = '#ffd60a';
  ctx.beginPath();
  ctx.moveTo(0, -58 - 6 * pulse);
  ctx.lineTo(10, -38 - 6 * pulse);
  ctx.lineTo(-10, -38 - 6 * pulse);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Collectible chip cases for mission 2.
  const step = G.missions.active ? G.missions.stepState : null;
  if (step && step.remaining) {
    for (const it of step.remaining) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.fillStyle = '#ff2e88';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = 14;
      ctx.fillRect(-9, -7, 18, 14);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-9, -2, 18, 3);
      ctx.restore();
    }
  }
  // Race checkpoints.
  if (G.missions.race.active) {
    const cp = G.missions.race.checkpoint;
    const c = G.raceCheckpoints[cp];
    if (c) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.strokeStyle = '#39ff88';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#39ff88';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#39ff88';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(cp + 1), 0, 8);
      ctx.restore();
    }
  }
}

function drawCarShape(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Neon underglow.
  ctx.shadowColor = car.color;
  ctx.shadowBlur = isPlayer ? 18 : 10;
  ctx.fillStyle = car.color;
  // Body: 44 long, 22 wide.
  ctx.beginPath();
  ctx.roundRect(-22, -11, 44, 22, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Cabin.
  ctx.fillStyle = 'rgba(10,10,20,0.85)';
  ctx.beginPath();
  ctx.roundRect(-8, -8, 18, 16, 4);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(20, -9, 3, 5);
  ctx.fillRect(20, 4, 3, 5);
  // Police light bar.
  if (car.kind === 'police') {
    const blink = Math.floor(Date.now() / 300) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2222' : '#2266ff';
    ctx.fillRect(-6, -11, 12, 4);
    ctx.fillStyle = blink ? '#2266ff' : '#ff2222';
    ctx.fillRect(-6, 7, 12, 4);
  }
  // Wreck: dark smoke tint.
  if (car.kind === 'wreck') {
    ctx.fillStyle = 'rgba(20,20,20,0.7)';
    ctx.beginPath();
    ctx.roundRect(-22, -11, 44, 22, 6);
    ctx.fill();
  }
  ctx.restore();
  // Health bar over the player's car.
  if (isPlayer && car.health < car.maxHealth) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(car.x - 22, car.y - 30, 44, 5);
    ctx.fillStyle = car.health > 40 ? '#39ff88' : '#ff5555';
    ctx.fillRect(car.x - 22, car.y - 30, 44 * (car.health / car.maxHealth), 5);
  }
}

function drawCars(G, ctx) {
  for (const car of G.cars) {
    if (car.kind === 'wreck') { drawCarShape(ctx, car, false); continue; }
    drawCarShape(ctx, car, car === G.player.car);
  }
}

function drawPeds(G, ctx) {
  for (const ped of G.peds) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    const bob = Math.sin(ped.walkPhase) * 1.5;
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(0, bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(Math.cos(ped.angle) * 2, bob + Math.sin(ped.angle) * 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (ped.panic > 0) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -14);
    }
    ctx.restore();
  }
}

function drawPlayer(G, ctx) {
  const p = G.player;
  if (p.car) return; // drawn as the car itself
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: jacket with neon trim.
  ctx.fillStyle = '#ff2e88';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(6, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Hair streak.
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.arc(3, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  // Punch animation.
  if (p.punchAnim > 0) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(16, 0, 8 * p.punchAnim, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.restore();
  // Health bar.
  if (p.health < p.maxHealth) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(p.x - 16, p.y - 26, 32, 4);
    ctx.fillStyle = p.health > 40 ? '#39ff88' : '#ff5555';
    ctx.fillRect(p.x - 16, p.y - 26, 32 * (p.health / p.maxHealth), 4);
  }
}

// Edge arrow pointing at an off-screen objective.
function drawTargetArrow(G, ctx, cw, ch) {
  const obj = currentObjective(G);
  if (!obj || obj.x === undefined) return;
  const cam = G.camera;
  const zoom = cam.zoom;
  const sx = (obj.x - cam.x) * zoom + cw / 2;
  const sy = (obj.y - cam.y) * zoom + ch / 2;
  if (sx > 0 && sx < cw && sy > 0 && sy < ch) return;
  const cx = clamp(sx, 40, cw - 40);
  const cy = clamp(sy, 40, ch - 40);
  const ang = Math.atan2(sy - ch / 2, sx - cw / 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = '#ffd60a';
  ctx.shadowColor = '#ffd60a';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHUD(G, ctx, cw, ch, pal) {
  if (G.mode === 'title') return;
  const p = G.player;
  ctx.textAlign = 'left';
  // Cash + mission.
  ctx.fillStyle = 'rgba(8,8,18,0.72)';
  ctx.beginPath();
  ctx.roundRect(12, 12, 320, 74, 10);
  ctx.fill();
  ctx.fillStyle = '#39ff88';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`$${G.cash}`, 24, 40);
  ctx.fillStyle = pal.text;
  ctx.font = '13px sans-serif';
  const obj = currentObjective(G);
  const label = obj ? obj.label : (G.missions.done ? 'Story complete — free roam' : 'Press Enter for the next job');
  wrapText(ctx, label, 24, 60, 296, 16);
  // Wanted stars, top centre.
  const starW = 26;
  const startX = cw / 2 - (5 * starW) / 2;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ff2e55' : 'rgba(255,255,255,0.25)';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', startX + i * starW + starW / 2, 40);
  }
  ctx.textAlign = 'left';
  // Car status, bottom left.
  if (p.car) {
    ctx.fillStyle = 'rgba(8,8,18,0.72)';
    ctx.beginPath();
    ctx.roundRect(12, ch - 66, 220, 54, 10);
    ctx.fill();
    ctx.fillStyle = pal.text;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(p.car.name, 24, ch - 42);
    ctx.fillStyle = '#00e5ff';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${Math.abs(Math.round(p.car.speed * 0.36))} km/h`, 24, ch - 22);
    ctx.fillStyle = p.car.health > 40 ? '#39ff88' : '#ff5555';
    ctx.fillRect(120, ch - 52, 100 * (p.car.health / p.car.maxHealth), 8);
  } else {
    ctx.fillStyle = 'rgba(8,8,18,0.72)';
    ctx.beginPath();
    ctx.roundRect(12, ch - 66, 260, 54, 10);
    ctx.fill();
    ctx.fillStyle = pal.text;
    ctx.font = '13px sans-serif';
    ctx.fillText('On foot — E near a car to drive', 24, ch - 42);
    ctx.fillText('Space to punch • Shift to run', 24, ch - 22);
  }
  // Orbs + race timer, bottom right.
  const orbsLeft = G.world.orbs.filter((o) => !o.taken).length;
  ctx.fillStyle = 'rgba(8,8,18,0.72)';
  ctx.beginPath();
  ctx.roundRect(cw - 232, ch - 66, 220, 54, 10);
  ctx.fill();
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`◆ Orbs ${20 - orbsLeft}/20`, cw - 220, ch - 42);
  ctx.fillStyle = pal.text;
  ctx.font = '13px sans-serif';
  if (G.missions.race.active) {
    ctx.fillText(`Race: ${G.missions.race.time.toFixed(1)}s — ${G.missions.race.checkpoint}/6`, cw - 220, ch - 22);
  } else if (G.missions.race.best !== null) {
    ctx.fillText(`Best race: ${G.missions.race.best.toFixed(1)}s`, cw - 220, ch - 22);
  } else {
    ctx.fillText('Race gate glows gold on the Strip', cw - 220, ch - 22);
  }
  // Minimap, top right.
  drawMinimap(G, ctx, cw, ch);
  // Mission timer.
  const step = G.missions.active ? currentObjective(G) : null;
  const def = G.missions.active ? G.missions : null;
  if (def && def.stepTimer > 0) {
    const s = G.missions;
    const st = s.active && MISSIONS_STEP(G);
    if (st && st.timeLimit !== undefined) {
      const left = Math.max(0, st.timeLimit - s.stepTimer);
      ctx.fillStyle = left < 20 ? '#ff5555' : '#ffd60a';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⏱ ${Math.ceil(left)}s`, cw / 2, 66);
      ctx.textAlign = 'left';
    }
  }
  // Toast message, above the bottom bar.
  if (G.toast && G.time < G.toastUntil) {
    ctx.fillStyle = G.toastColor || '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(G.toast, cw / 2, ch - 84);
    ctx.textAlign = 'left';
  }
}

function MISSIONS_STEP(G) {
  const def = G.missionsDef[G.missions.index];
  if (!def) return null;
  return def.steps[G.missions.stepIndex] || null;
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawMinimap(G, ctx, cw, ch) {
  const mw = 200;
  const mh = 150;
  const mx = cw - mw - 12;
  const my = 12;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(8,8,18,0.78)';
  ctx.beginPath();
  ctx.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#141024';
  ctx.fillRect(mx, my, mw, mh);
  // District tints.
  for (const d of G.districts) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy);
  }
  // Roads.
  ctx.fillStyle = '#3a2f52';
  for (const x of roadXs()) ctx.fillRect(mx + (x - 8) * sx, my, 16 * sx, mh);
  for (const y of roadYs()) ctx.fillRect(mx, my + (y - 8) * sy, mw, 16 * sy);
  // Orbs.
  ctx.fillStyle = '#00e5ff';
  for (const o of G.world.orbs) {
    if (!o.taken) ctx.fillRect(mx + o.x * sx - 1, my + o.y * sy - 1, 2, 2);
  }
  // Mission target.
  const obj = currentObjective(G);
  if (obj && obj.x !== undefined) {
    const pulse = 3 + 2 * Math.sin(G.time * 5);
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(mx + obj.x * sx, my + obj.y * sy, pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police.
  ctx.fillStyle = '#2e6bff';
  for (const c of G.cars) {
    if (c.kind === 'police') {
      ctx.beginPath();
      ctx.arc(mx + c.x * sx, my + c.y * sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Player.
  const p = G.player;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx + p.x * sx, my + p.y * sy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // North label.
  ctx.fillStyle = '#b9aed6';
  ctx.font = '10px sans-serif';
  ctx.fillText('NEON CITY', mx, my + mh + 14);
}

function drawBanner(G, ctx, cw, ch, pal) {
  if (!G.bannerText || G.time > G.bannerUntil) return;
  ctx.fillStyle = 'rgba(8,8,18,0.85)';
  const bw = Math.min(720, cw - 80);
  ctx.beginPath();
  ctx.roundRect(cw / 2 - bw / 2, 84, bw, 96, 12);
  ctx.fill();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(G.bannerText, cw / 2, 116);
  ctx.fillStyle = pal.text;
  ctx.font = '14px sans-serif';
  wrapTextCenter(ctx, G.bannerSub, cw / 2, 142, bw - 32, 18);
  ctx.textAlign = 'left';
}

function wrapTextCenter(ctx, text, cx, y, maxW, lineH) {
  if (!text) return;
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function drawTitle(G, ctx, cw, ch, pal) {
  ctx.fillStyle = 'rgba(6,4,14,0.82)';
  ctx.fillRect(0, 0, cw, ch);
  const cx = cw / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff2e88';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = 34;
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('NEON CITY', cx, ch * 0.30);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('A NEON-COURIER CRIME STORY', cx, ch * 0.30 + 38);
  ctx.fillStyle = pal.text;
  ctx.font = '16px sans-serif';
  ctx.fillText('Vex runs packages for Madame Lumen on the Strip. The Neon King wants it all.', cx, ch * 0.42);
  ctx.fillText('Drive, steal, run, survive — and take the city back, one job at a time.', cx, ch * 0.42 + 24);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(G.hasSave ? 'ENTER — Start new game      C — Continue saved game' : 'ENTER — Start game', cx, ch * 0.56);
  ctx.fillStyle = pal.dim;
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD / Arrows — move & drive • E — enter / exit car • Space — punch / handbrake', cx, ch * 0.64);
  ctx.fillText('Shift — run • Esc — pause • U — mute • Missions pay cash • Orbs +$25 • Race gate on the Strip', cx, ch * 0.64 + 22);
  ctx.fillStyle = '#ff2e88';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('5 missions • street races • wanted level 0–5 • police pursuit • save included', cx, ch * 0.72);
  ctx.textAlign = 'left';
}

function drawPause(G, ctx, cw, ch, pal) {
  ctx.fillStyle = 'rgba(6,4,14,0.72)';
  ctx.fillRect(0, 0, cw, ch);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', cw / 2, ch * 0.4);
  ctx.fillStyle = pal.text;
  ctx.font = '16px sans-serif';
  ctx.fillText('Enter — resume • R — restart mission • T — back to title', cw / 2, ch * 0.4 + 40);
  ctx.textAlign = 'left';
}

function drawEndScreen(G, ctx, cw, ch, pal, title, sub, color) {
  ctx.fillStyle = 'rgba(6,4,14,0.8)';
  ctx.fillRect(0, 0, cw, ch);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(title, cw / 2, ch * 0.4);
  ctx.shadowBlur = 0;
  ctx.fillStyle = pal.text;
  ctx.font = '16px sans-serif';
  ctx.fillText(sub, cw / 2, ch * 0.4 + 36);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Press Enter to continue', cw / 2, ch * 0.4 + 76);
  ctx.textAlign = 'left';
}
