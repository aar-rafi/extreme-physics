// Drawing utilities for graphs and canvas
import { g } from './physics.js';

let canvas;
let ctx;
let velGraphCanvas;
let heightGraphCanvas;
let accelGraphCanvas;
let velGraphCtx;
let heightGraphCtx;
let accelGraphCtx;
let secondGraphTypeEl;

export function initCanvases() {
  canvas = document.getElementById('canvas');
  ctx = canvas ? canvas.getContext('2d') : null;
  velGraphCanvas = document.getElementById('velGraphCanvas');
  heightGraphCanvas = document.getElementById('heightGraphCanvas');
  accelGraphCanvas = document.getElementById('accelGraphCanvas');
  velGraphCtx = velGraphCanvas ? velGraphCanvas.getContext('2d') : null;
  heightGraphCtx = heightGraphCanvas ? heightGraphCanvas.getContext('2d') : null;
  accelGraphCtx = accelGraphCanvas ? accelGraphCanvas.getContext('2d') : null;
  secondGraphTypeEl = document.getElementById('secondGraphType');
}

export function getContexts() {
  return { canvas, ctx, velGraphCanvas, heightGraphCanvas, accelGraphCanvas, velGraphCtx, heightGraphCtx, accelGraphCtx, secondGraphTypeEl };
}

export function resizeCanvasMain() {
  if (!canvas || !ctx) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function resizeGraphCanvases() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  if (velGraphCanvas && velGraphCtx) {
    const r = velGraphCanvas.getBoundingClientRect();
    velGraphCanvas.width = Math.floor(r.width * dpr);
    velGraphCanvas.height = Math.floor(r.height * dpr);
    velGraphCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  if (heightGraphCanvas && heightGraphCtx) {
    const r2 = heightGraphCanvas.getBoundingClientRect();
    heightGraphCanvas.width = Math.floor(r2.width * dpr);
    heightGraphCanvas.height = Math.floor(r2.height * dpr);
    heightGraphCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  if (accelGraphCanvas && accelGraphCtx) {
    const r3 = accelGraphCanvas.getBoundingClientRect();
    accelGraphCanvas.width = Math.floor(r3.width * dpr);
    accelGraphCanvas.height = Math.floor(r3.height * dpr);
    accelGraphCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

export function computeScale(positions, predictedPositions = null, yLanding = 0) {
  if (!canvas) return { xScale: 1, yScale: 1, minYRel: 0 };
  const rect = canvas.getBoundingClientRect();
  let maxX = 0;
  let maxY = 0;
  let minYRel = Infinity;
  positions.forEach((p) => {
    const yRel = p.y - yLanding;
    if (p.x > maxX) maxX = p.x;
    if (yRel > maxY) maxY = yRel;
    if (yRel < minYRel) minYRel = yRel;
  });
  if (predictedPositions) {
    predictedPositions.forEach((p) => {
      const yRel = p.y - yLanding;
      if (p.x > maxX) maxX = p.x;
      if (yRel > maxY) maxY = yRel;
      if (yRel < minYRel) minYRel = yRel;
    });
  }
  if (!isFinite(minYRel)) minYRel = 0;
  if (!isFinite(maxY)) maxY = 0;
  let rangeX = maxX * 1.1;
  let rangeY = (maxY - minYRel) * 1.2;
  if (rangeX === 0) rangeX = 1;
  if (rangeY === 0) rangeY = 1;
  const scaleX = rect.width / rangeX;
  const scaleY = rect.height / rangeY;
  const scale = Math.min(scaleX, scaleY);
  return { xScale: scale, yScale: scale, minYRel };
}

export function drawArrow(ctx, x, y, dx, dy, color) {
  const endX = x + dx;
  const endY = y + dy;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  const angle = Math.atan2(dy, dx);
  const headLen = 8;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(endX, endY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawVectorsAtIndex(positions, index, yLanding, xScale, yScale, minYRel) {
  if (!canvas || !ctx || !positions || positions.length === 0) return;
  const rect = canvas.getBoundingClientRect();
  const i = Math.max(0, Math.min(index, positions.length - 1));
  const p = positions[i];
  const cx = p.x * xScale;
  const cy = rect.height - (p.y - yLanding - minYRel) * yScale;
  // velocity estimate
  let vx = 0;
  let vy = 0;
  if (i > 0) {
    const prev = positions[i - 1];
    const dtv = Math.max(positions[i].t - prev.t, 1e-3);
    vx = (positions[i].x - prev.x) / dtv;
    vy = (positions[i].y - prev.y) / dtv;
  } else if (positions.length > 1) {
    const next = positions[i + 1];
    const dtv = Math.max(next.t - positions[i].t, 1e-3);
    vx = (next.x - positions[i].x) / dtv;
    vy = (next.y - positions[i].y) / dtv;
  }
  // acceleration estimate
  let ax = 0;
  let ay = -g;
  if (i > 1) {
    const prev = positions[i - 1];
    const prev2 = positions[i - 2];
    const dt1 = Math.max(positions[i].t - prev.t, 1e-3);
    const dt2 = Math.max(prev.t - prev2.t, 1e-3);
    const vx1 = (positions[i].x - prev.x) / dt1;
    const vy1 = (positions[i].y - prev.y) / dt1;
    const vx0 = (prev.x - prev2.x) / dt2;
    const vy0 = (prev.y - prev2.y) / dt2;
    const dt = Math.max((dt1 + dt2) / 2, 1e-3);
    ax = (vx1 - vx0) / dt;
    ay = (vy1 - vy0) / dt;
  }
  let dxV = vx * xScale;
  let dyV = -vy * yScale;
  let dxA = ax * xScale;
  let dyA = -ay * yScale;
  const maxVelLen = 80;
  const lenV = Math.hypot(dxV, dyV) || 1;
  const scaleV = Math.min(1, maxVelLen / lenV);
  dxV *= scaleV;
  dyV *= scaleV;
  const maxAccLen = 60;
  const lenA = Math.hypot(dxA, dyA) || 1;
  const scaleA = Math.min(1, maxAccLen / lenA);
  dxA *= scaleA;
  dyA *= scaleA;
  drawArrow(ctx, cx, cy, dxV, dyV, '#7fda89');
  drawArrow(ctx, cx, cy, dxA, dyA, '#ff5c7a');
}

export function plotVelocityGraph(velocityTrace) {
  if (!velGraphCanvas || !velGraphCtx) return;
  const rect = velGraphCanvas.getBoundingClientRect();
  velGraphCtx.clearRect(0, 0, rect.width, rect.height);
  if (!velocityTrace || velocityTrace.length === 0) return;
  const maxT = velocityTrace[velocityTrace.length - 1].t;
  let maxV = 0;
  velocityTrace.forEach((pt) => {
    if (pt.v > maxV) maxV = pt.v;
  });
  const margin = 40;
  const width = rect.width - margin * 2;
  const height = rect.height - margin * 2;
  velGraphCtx.strokeStyle = '#2a3a6a';
  velGraphCtx.lineWidth = 1;
  velGraphCtx.beginPath();
  velGraphCtx.moveTo(margin, margin);
  velGraphCtx.lineTo(margin, margin + height);
  velGraphCtx.lineTo(margin + width, margin + height);
  velGraphCtx.stroke();
  velGraphCtx.font = '10px Inter, ui-sans-serif, system-ui';
  velGraphCtx.fillStyle = '#a8b2c3';
  const numTicks = 5;
  for (let i = 0; i <= numTicks; i++) {
    const tx = margin + (i / numTicks) * width;
    const tVal = (maxT * i) / numTicks;
    velGraphCtx.beginPath();
    velGraphCtx.moveTo(tx, margin + height);
    velGraphCtx.lineTo(tx, margin + height + 4);
    velGraphCtx.stroke();
    velGraphCtx.fillText(tVal.toFixed(1), tx - 12, margin + height + 16);
    const ty = margin + height - (i / numTicks) * height;
    const vVal = (maxV * i) / numTicks;
    velGraphCtx.beginPath();
    velGraphCtx.moveTo(margin, ty);
    velGraphCtx.lineTo(margin - 4, ty);
    velGraphCtx.stroke();
    velGraphCtx.fillText(vVal.toFixed(1), margin - 35, ty + 3);
  }
  velGraphCtx.fillStyle = '#e8ecf1';
  velGraphCtx.font = '11px Inter, ui-sans-serif, system-ui';
  velGraphCtx.fillText('Time (s)', margin + width / 2 - 20, rect.height - 8);
  velGraphCtx.save();
  velGraphCtx.translate(12, margin + height / 2 + 15);
  velGraphCtx.rotate(-Math.PI / 2);
  velGraphCtx.fillText('Velocity (m/s)', 0, 0);
  velGraphCtx.restore();
  velGraphCtx.strokeStyle = '#7fda89';
  velGraphCtx.lineWidth = 2;
  velGraphCtx.beginPath();
  for (let i = 0; i < velocityTrace.length; i++) {
    const pt = velocityTrace[i];
    const x = margin + (pt.t / maxT) * width;
    const y = margin + height - (pt.v / (maxV || 1)) * height;
    if (i === 0) velGraphCtx.moveTo(x, y);
    else velGraphCtx.lineTo(x, y);
  }
  velGraphCtx.stroke();
}

export function plotHeightGraph(positions) {
  if (!heightGraphCanvas || !heightGraphCtx || !positions || positions.length === 0) return;
  const rect = heightGraphCanvas.getBoundingClientRect();
  heightGraphCtx.clearRect(0, 0, rect.width, rect.height);
  const maxT = positions[positions.length - 1].t;
  let minY = Infinity;
  let maxY = -Infinity;
  positions.forEach((p) => {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  if (!isFinite(minY)) minY = 0;
  if (!isFinite(maxY)) maxY = 1;
  const margin = 40;
  const width = rect.width - margin * 2;
  const height = rect.height - margin * 2;
  heightGraphCtx.strokeStyle = '#2a3a6a';
  heightGraphCtx.lineWidth = 1;
  heightGraphCtx.beginPath();
  heightGraphCtx.moveTo(margin, margin);
  heightGraphCtx.lineTo(margin, margin + height);
  heightGraphCtx.lineTo(margin + width, margin + height);
  heightGraphCtx.stroke();
  if (minY < 0 && maxY > 0) {
    const zeroY = margin + height - ((0 - minY) / (maxY - minY)) * height;
    heightGraphCtx.strokeStyle = 'rgba(255,255,255,0.2)';
    heightGraphCtx.beginPath();
    heightGraphCtx.moveTo(margin, zeroY);
    heightGraphCtx.lineTo(margin + width, zeroY);
    heightGraphCtx.stroke();
  }
  heightGraphCtx.font = '10px Inter, ui-sans-serif, system-ui';
  heightGraphCtx.fillStyle = '#a8b2c3';
  const numTicks = 5;
  for (let i = 0; i <= numTicks; i++) {
    const tx = margin + (i / numTicks) * width;
    const tVal = (maxT * i) / numTicks;
    heightGraphCtx.beginPath();
    heightGraphCtx.moveTo(tx, margin + height);
    heightGraphCtx.lineTo(tx, margin + height + 4);
    heightGraphCtx.stroke();
    heightGraphCtx.fillText(tVal.toFixed(1), tx - 12, margin + height + 16);
    const ty = margin + height - (i / numTicks) * height;
    const hVal = minY + (maxY - minY) * (i / numTicks);
    heightGraphCtx.beginPath();
    heightGraphCtx.moveTo(margin, ty);
    heightGraphCtx.lineTo(margin - 4, ty);
    heightGraphCtx.stroke();
    heightGraphCtx.fillText(hVal.toFixed(1), margin - 35, ty + 3);
  }
  heightGraphCtx.fillStyle = '#e8ecf1';
  heightGraphCtx.font = '11px Inter, ui-sans-serif, system-ui';
  heightGraphCtx.fillText('Time (s)', margin + width / 2 - 20, rect.height - 8);
  heightGraphCtx.save();
  heightGraphCtx.translate(12, margin + height / 2 + 15);
  heightGraphCtx.rotate(-Math.PI / 2);
  heightGraphCtx.fillText('Height (m)', 0, 0);
  heightGraphCtx.restore();
  heightGraphCtx.strokeStyle = '#3aa0ff';
  heightGraphCtx.lineWidth = 2;
  heightGraphCtx.beginPath();
  for (let i = 0; i < positions.length; i++) {
    const pt = positions[i];
    const x = margin + (pt.t / maxT) * width;
    const v = (pt.y - minY) / (maxY - minY || 1);
    const y = margin + height - v * height;
    if (i === 0) heightGraphCtx.moveTo(x, y);
    else heightGraphCtx.lineTo(x, y);
  }
  heightGraphCtx.stroke();
}

export function plotAccelerationOnHeightCanvas(accTrace) {
  if (!accelGraphCanvas || !accelGraphCtx) return;
  const rect = accelGraphCanvas.getBoundingClientRect();
  accelGraphCtx.clearRect(0, 0, rect.width, rect.height);
  if (!accTrace || accTrace.length === 0) return;
  const maxT = accTrace[accTrace.length - 1].t;
  let maxA = 0;
  accTrace.forEach((pt) => {
    if (pt.a > maxA) maxA = pt.a;
  });
  const margin = 40;
  const width = rect.width - margin * 2;
  const height = rect.height - margin * 2;
  accelGraphCtx.strokeStyle = '#2a3a6a';
  accelGraphCtx.lineWidth = 1;
  accelGraphCtx.beginPath();
  accelGraphCtx.moveTo(margin, margin);
  accelGraphCtx.lineTo(margin, margin + height);
  accelGraphCtx.lineTo(margin + width, margin + height);
  accelGraphCtx.stroke();
  accelGraphCtx.fillStyle = '#e8ecf1';
  accelGraphCtx.font = '11px Inter, ui-sans-serif, system-ui';
  accelGraphCtx.fillText('Time (s)', margin + width / 2 - 20, rect.height - 8);
  accelGraphCtx.save();
  accelGraphCtx.translate(12, margin + height / 2 + 15);
  accelGraphCtx.rotate(-Math.PI / 2);
  accelGraphCtx.fillText('Acceleration (m/s^2)', 0, 0);
  accelGraphCtx.restore();
  accelGraphCtx.font = '10px Inter, ui-sans-serif, system-ui';
  accelGraphCtx.fillStyle = '#a8b2c3';
  const numTicks = 5;
  for (let i = 0; i <= numTicks; i++) {
    const tx = margin + (i / numTicks) * width;
    const tVal = (maxT * i) / numTicks;
    accelGraphCtx.beginPath();
    accelGraphCtx.moveTo(tx, margin + height);
    accelGraphCtx.lineTo(tx, margin + height + 4);
    accelGraphCtx.stroke();
    accelGraphCtx.fillText(tVal.toFixed(1), tx - 12, margin + height + 16);
    const ty = margin + height - (i / numTicks) * height;
    const aVal = (maxA * i) / numTicks;
    accelGraphCtx.beginPath();
    accelGraphCtx.moveTo(margin, ty);
    accelGraphCtx.lineTo(margin - 4, ty);
    accelGraphCtx.stroke();
    accelGraphCtx.fillText(aVal.toFixed(1), margin - 35, ty + 3);
  }
  accelGraphCtx.strokeStyle = '#ffb86b';
  accelGraphCtx.lineWidth = 2;
  accelGraphCtx.beginPath();
  for (let i = 0; i < accTrace.length; i++) {
    const pt = accTrace[i];
    const x = margin + (pt.t / maxT) * width;
    const y = margin + height - (pt.a / (maxA || 1)) * height;
    if (i === 0) accelGraphCtx.moveTo(x, y);
    else accelGraphCtx.lineTo(x, y);
  }
  accelGraphCtx.stroke();
}

