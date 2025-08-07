import { RENDER } from './constants.js';
import { add, subtract, length } from './vec2.js';
import { computeCenterOfMass, computeAccelerations, computeEnergy, computeAngularMomentum } from './physics.js';

export function worldToCanvas(canvas, p) {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  return { x: cx + p.x, y: cy - p.y };
}

export function drawGrid(ctx, canvas) {
  const rect = canvas.getBoundingClientRect();
  ctx.save();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const spacing = RENDER.gridSpacing;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < rect.width; x += spacing) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, rect.height); ctx.stroke(); }
  for (let y = 0; y < rect.height; y += spacing) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(rect.width, y + 0.5); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(122,161,255,0.35)';
  ctx.beginPath(); ctx.moveTo(0, rect.height / 2 + 0.5); ctx.lineTo(rect.width, rect.height / 2 + 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rect.width / 2 + 0.5, 0); ctx.lineTo(rect.width / 2 + 0.5, rect.height); ctx.stroke();
  ctx.restore();
}

export function drawArrow(ctx, x1, y1, x2, y2, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1; const ux = dx / len, uy = dy / len;
  const size = RENDER.arrowHeadSize;
  const leftX = x2 - ux * size - uy * size * 0.6; const leftY = y2 - uy * size + ux * size * 0.6;
  const rightX = x2 - ux * size + uy * size * 0.6; const rightY = y2 - uy * size - ux * size * 0.6;
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(leftX, leftY); ctx.lineTo(rightX, rightY); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawTimeseries(ctx, state, bounds, seriesDefs, label) {
  const { x, y, w, h } = bounds;
  const m = state.metrics; const n = m.t.length; if (n < 2) return;
  let minV = Infinity, maxV = -Infinity;
  for (const s of seriesDefs) { const arr = m[s.key]; for (let i = 0; i < n; i++) { const v = arr[i]; if (Number.isFinite(v)) { if (v < minV) minV = v; if (v > maxV) maxV = v; } } }
  if (!Number.isFinite(minV) || !Number.isFinite(maxV)) return;
  if (minV === maxV) { minV -= 1; maxV += 1; }
  ctx.save();
  ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  for (let gx = 0; gx <= 4; gx++) { const xx = x + (gx/4) * w + 0.5; ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); }
  for (let gy = 0; gy <= 2; gy++) { const yy = y + (gy/2) * h + 0.5; ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
  ctx.stroke();
  for (const s of seriesDefs) {
    const arr = m[s.key]; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + (i / (n - 1)) * (w - 6) + 3;
      const py = y + (1 - (arr[i] - minV) / (maxV - minV)) * (h - 6) + 3;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = s.color + 'cc'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.fillText(label, x + 6, y + 14);
  ctx.restore();
}

export function draw(ctx, canvas, state) {
  const rect = canvas.getBoundingClientRect();
  drawGrid(ctx, canvas);
  const com = computeCenterOfMass(state.bodies);
  const frameOffset = state.comFrame ? { x: -com.position.x, y: -com.position.y } : { x: 0, y: 0 };
  const forces = computeAccelerations(state.bodies, state.G, state.eps).map((a, i) => ({ x: a.x * state.bodies[i].mass, y: a.y * state.bodies[i].mass }));

  if (state.showTrails) {
    for (const b of state.bodies) {
      if (b.trail.length < 2) continue;
      ctx.beginPath();
      for (let i = 0; i < b.trail.length; i++) {
        const p = worldToCanvas(canvas, { x: b.trail[i].x + frameOffset.x, y: b.trail[i].y + frameOffset.y });
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = b.color + 'cc'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  for (const b of state.bodies) {
    const p = worldToCanvas(canvas, { x: b.position.x + frameOffset.x, y: b.position.y + frameOffset.y });
    ctx.beginPath(); ctx.arc(p.x, p.y, b.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, b.radius + 2);
    gradient.addColorStop(0, b.color); gradient.addColorStop(1, '#0d1430');
    ctx.fillStyle = gradient; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#1c2a55'; ctx.stroke();
  }

  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    const pos = worldToCanvas(canvas, { x: b.position.x + frameOffset.x, y: b.position.y + frameOffset.y });
    if (state.showVelocityVectors) { const vx = b.velocity.x, vy = b.velocity.y; drawArrow(ctx, pos.x, pos.y, pos.x + vx * 20, pos.y - vy * 20, '#ffd35a'); }
    if (state.showForceVectors) { const f = forces[i]; drawArrow(ctx, pos.x, pos.y, pos.x + f.x * 0.6, pos.y - f.y * 0.6, '#7aa8ff'); }
    if (state.showPositionVectors) { const origin = worldToCanvas(canvas, { x: frameOffset.x, y: frameOffset.y }); drawArrow(ctx, origin.x, origin.y, pos.x, pos.y, '#7fda89'); }
  }
  if (state.showDisplacementVector && state.bodies.length >= 2) {
    const b1 = state.bodies[0]; const b2 = state.bodies[1];
    const p1 = worldToCanvas(canvas, { x: b1.position.x + frameOffset.x, y: b1.position.y + frameOffset.y });
    const p2 = worldToCanvas(canvas, { x: b2.position.x + frameOffset.x, y: b2.position.y + frameOffset.y });
    drawArrow(ctx, p1.x, p1.y, p2.x, p2.y, '#ffa0b3');
  }

  if (state.showCOM) {
    const p = worldToCanvas(canvas, { x: com.position.x + frameOffset.x, y: com.position.y + frameOffset.y });
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc14d'; ctx.fill(); ctx.strokeStyle = '#a5751a'; ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  if (state.energy0 == null || state.angularMomentum0 == null) {
    state.energy0 = computeEnergy(state.bodies, state.G, state.eps);
    state.angularMomentum0 = computeAngularMomentum(state.bodies);
  }
  const E = computeEnergy(state.bodies, state.G, state.eps);
  const Lz = computeAngularMomentum(state.bodies);
  const dE = E - state.energy0; const dL = Lz - state.angularMomentum0;
  const escapeText = state.escaped ? '  |  escaped' : '';
  const text = `t=${state.time.toFixed(2)}  int=${state.integrator}  |  dE=${dE.toExponential(2)}  dL=${dL.toExponential(2)}${escapeText}`;
  ctx.fillText(text, 12, rect.height - 12);

  const pad = 8;
  const h = Math.min(RENDER.graphsMaxPanelHeight, Math.floor(rect.height * 0.28));
  const w = rect.width - 2 * pad; const x = pad; const y = rect.height - h - 24;
  ctx.save(); ctx.fillStyle = 'rgba(5,10,26,0.8)'; ctx.strokeStyle = '#1b2447'; ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const mid = y + Math.floor(h * 0.58);
  drawTimeseries(ctx, state, {x, y: y + 4, w, h: mid - y - 8}, [
    {key: 'KE', color: '#ffcf5d'}, {key: 'PE', color: '#7aa8ff'}, {key: 'E', color: '#7fda89'}
  ], 'Energy');
  drawTimeseries(ctx, state, {x, y: mid + 4, w, h: y + h - mid - 8}, [
    {key: 'v1', color: '#7fda89'}, {key: 'v2', color: '#3aa0ff'}, {key: 'r12', color: '#ffa0b3'}
  ], 'v1, v2, r12');
  ctx.restore();
}

