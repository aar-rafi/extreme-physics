// Entry point: wires UI, physics, drawing, and equations
import { g, degToRad, analyticSolution, eulerSolution, rk4Solution } from './physics.js';
import {
  initCanvases,
  getContexts,
  resizeCanvasMain,
  resizeGraphCanvases,
  computeScale,
  drawArrow,
  drawVectorsAtIndex,
  plotVelocityGraph,
  plotHeightGraph,
  plotAccelerationOnHeightCanvas,
} from './draw.js';
import { buildAccelerationEquation } from './equations.js';

let isPlaying = false;
let lastResult = null;
let lastPrediction = null;
let currentYLanding = 0;
let animationId = null;
let graphsResizeObserver = null;

// HUD elements
let hudTimeEl, hudXEl, hudYEl, hudVxEl, hudVyEl, hudVEl;
let showGridCanvasEl, showPredictionCanvasEl, airResistanceCanvasEl, solverCanvasEl;

function initializeDOMRefs() {
  const { velGraphCanvas, heightGraphCanvas, accelGraphCanvas } = getContexts();
  // HUD
  hudTimeEl = document.getElementById('hudTime');
  hudXEl = document.getElementById('hudX');
  hudYEl = document.getElementById('hudY');
  hudVxEl = document.getElementById('hudVx');
  hudVyEl = document.getElementById('hudVy');
  hudVEl = document.getElementById('hudV');
  showGridCanvasEl = document.getElementById('showGridCanvas');
  showPredictionCanvasEl = document.getElementById('showPredictionCanvas');
  airResistanceCanvasEl = document.getElementById('airResistanceCanvas');
  solverCanvasEl = document.getElementById('solverCanvas');
}

function setPlayUI(isPlay) {
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const label = document.getElementById('playPauseText');
  if (playIcon && pauseIcon && label) {
    if (isPlay) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = '';
      label.textContent = 'Pause';
    } else {
      playIcon.style.display = '';
      pauseIcon.style.display = 'none';
      label.textContent = 'Play';
    }
  }
}

function togglePlayPause() {
  isPlaying = !isPlaying;
  setPlayUI(isPlaying);
  if (isPlaying) {
    runSimulation();
  } else if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function buildAccelTrace(positions) {
  const accTrace = [];
  if (!positions || positions.length < 3) return accTrace;
  for (let i = 2; i < positions.length; i++) {
    const p0 = positions[i - 2];
    const p1 = positions[i - 1];
    const p2 = positions[i];
    const dt1 = Math.max(p1.t - p0.t, 1e-3);
    const dt2 = Math.max(p2.t - p1.t, 1e-3);
    const vx0 = (p1.x - p0.x) / dt1;
    const vy0 = (p1.y - p0.y) / dt1;
    const vx1 = (p2.x - p1.x) / dt2;
    const vy1 = (p2.y - p1.y) / dt2;
    const dt = Math.max((dt1 + dt2) / 2, 1e-3);
    const ax = (vx1 - vx0) / dt;
    const ay = (vy1 - vy0) / dt;
    const a = Math.sqrt(ax * ax + ay * ay);
    accTrace.push({ t: p2.t, a });
  }
  return accTrace;
}

function drawHeightIndicators(ctx, y0, yLanding, xScale, yScale, minYRel, rectHeight) {
  const launchY = rectHeight - (y0 - yLanding - minYRel) * yScale;
  const landingY = rectHeight - (0 - minYRel) * yScale;
  const boxWidth = 14;
  const boxHeight = 14;
  ctx.fillStyle = '#e67e22';
  ctx.fillRect(5, launchY - boxHeight / 2, boxWidth, boxHeight);
  ctx.fillStyle = '#000';
  ctx.font = '9px Arial';
  ctx.fillText('Start', 5 + boxWidth + 2, launchY + 3);
  ctx.fillStyle = '#3498db';
  ctx.fillRect(rectHeight ? rectHeight : 0, 0, 0, 0); // no-op to keep ctx used
}

function drawTrajectory(positions, predictedPositions = null, yLanding = 0) {
  const { canvas, ctx } = getContexts();
  if (!canvas || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const { xScale, yScale, minYRel } = computeScale(positions, predictedPositions, yLanding);
  // grid
  const spacing = 50;
  if (document.getElementById('showGridCanvas')?.checked) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < rect.width; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, rect.height); ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(rect.width, y + 0.5); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(122,161,255,0.35)';
    ctx.beginPath(); ctx.moveTo(0, rect.height / 2 + 0.5); ctx.lineTo(rect.width, rect.height / 2 + 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rect.width / 2 + 0.5, 0); ctx.lineTo(rect.width / 2 + 0.5, rect.height); ctx.stroke();
    ctx.restore();
  }
  // prediction
  if (predictedPositions && document.getElementById('showPredictionCanvas')?.checked) {
    ctx.beginPath();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--prediction').trim() || 'rgba(139,92,246,0.5)';
    for (let i = 0; i < predictedPositions.length; i++) {
      const px = predictedPositions[i].x * xScale;
      const py = rect.height - (predictedPositions[i].y - yLanding - minYRel) * yScale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // actual
  ctx.beginPath();
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--traj').trim() || '#5cc8ff';
  for (let i = 0; i < positions.length; i++) {
    const px = positions[i].x * xScale;
    const py = rect.height - (positions[i].y - yLanding - minYRel) * yScale;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // HUD
  const last = positions[positions.length - 1] || { x: 0, y: 0, t: 0 };
  if (hudTimeEl) hudTimeEl.textContent = last.t.toFixed(2);
  if (hudXEl) hudXEl.textContent = last.x.toFixed(2);
  if (hudYEl) hudYEl.textContent = last.y.toFixed(2);
  // vectors at end
  if (positions.length > 0) {
    drawVectorsAtIndex(positions, positions.length - 1, yLanding, xScale, yScale, minYRel);
  }
}

function animateSimulation(result, predictedPositions, yLanding = 0) {
  const { canvas, ctx } = getContexts();
  if (!canvas || !ctx) return;
  if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
  const positions = result.positions;
  const velocityTrace = result.velocityTrace || [];
  const { xScale, yScale, minYRel } = computeScale(positions, predictedPositions, yLanding);
  const totalTime = result.tof;
  const startTime = performance.now();
  function frame() {
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    const elapsed = (now - startTime) / 1000;
    const fraction = totalTime > 0 ? Math.min(elapsed / totalTime, 1) : 1;
    const index = Math.floor(fraction * (positions.length - 1));
    ctx.clearRect(0, 0, rect.width, rect.height);
    // grid
    const spacing = 50;
    if (document.getElementById('showGridCanvas')?.checked) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < rect.width; x += spacing) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, rect.height); ctx.stroke();
      }
      for (let y = 0; y < rect.height; y += spacing) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(rect.width, y + 0.5); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(122,161,255,0.35)';
      ctx.beginPath(); ctx.moveTo(0, rect.height / 2 + 0.5); ctx.lineTo(rect.width, rect.height / 2 + 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rect.width / 2 + 0.5, 0); ctx.lineTo(rect.width / 2 + 0.5, rect.height); ctx.stroke();
      ctx.restore();
    }
    // prediction
    if (predictedPositions) {
      ctx.beginPath();
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--prediction').trim() || 'rgba(139,92,246,0.5)';
      for (let i = 0; i < predictedPositions.length; i++) {
        const px = predictedPositions[i].x * xScale;
        const py = rect.height - (predictedPositions[i].y - yLanding - minYRel) * yScale;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // partial trajectory
    ctx.beginPath();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--traj').trim() || '#5cc8ff';
    for (let i = 0; i <= index; i++) {
      const px = positions[i].x * xScale;
      const py = rect.height - (positions[i].y - yLanding - minYRel) * yScale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const current = positions[index];
    const cx = current.x * xScale;
    const cy = rect.height - (current.y - yLanding - minYRel) * yScale;
    ctx.beginPath();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--projectile').trim() || '#ffd166';
    ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
    ctx.fill();
    drawVectorsAtIndex(positions, index, yLanding, xScale, yScale, minYRel);
    // HUD
    if (hudTimeEl) hudTimeEl.textContent = elapsed.toFixed(2);
    if (hudXEl) hudXEl.textContent = current.x.toFixed(2);
    if (hudYEl) hudYEl.textContent = current.y.toFixed(2);
    if (hudVEl && velocityTrace.length > 0) {
      const vt = velocityTrace[Math.min(index, velocityTrace.length - 1)];
      hudVEl.textContent = vt.v.toFixed(2);
    }
    if (index > 0 && (hudVxEl || hudVyEl)) {
      const prev = positions[index - 1];
      const dt = positions[index].t - prev.t || 0.001;
      const vx = (positions[index].x - prev.x) / dt;
      const vy = (positions[index].y - prev.y) / dt;
      if (hudVxEl) hudVxEl.textContent = vx.toFixed(2);
      if (hudVyEl) hudVyEl.textContent = vy.toFixed(2);
    }
    // graphs
    if (velocityTrace.length > 0) {
      plotVelocityGraph(velocityTrace.slice(0, index + 1));
      plotHeightGraph(positions.slice(0, index + 1));
      const accTrace = buildAccelTrace(positions.slice(0, index + 1));
      plotAccelerationOnHeightCanvas(accTrace);
    }
    if (fraction < 1) {
      animationId = requestAnimationFrame(frame);
    } else {
      if (velocityTrace.length > 0) {
        plotVelocityGraph(velocityTrace);
        plotHeightGraph(positions);
        const accTrace = buildAccelTrace(positions);
        plotAccelerationOnHeightCanvas(accTrace);
      }
    }
  }
  frame();
}

function updateEquationBox({ solver, airResistance, v0, angle, mass, dragCoeff, area, airDensity }) {
  const el = document.getElementById('equationBox');
  if (!el) return;
  el.textContent = buildAccelerationEquation({
    solver,
    airResistance,
    v0,
    angleDeg: angle,
    mass,
    dragCoeff,
    area,
    airDensity,
  });
}

function redrawAllGraphsFromCache() {
  if (!lastResult) return;
  plotVelocityGraph(lastResult.velocityTrace || []);
  plotHeightGraph(lastResult.positions || []);
  const accTrace = buildAccelTrace(lastResult.positions || []);
  plotAccelerationOnHeightCanvas(accTrace);
}

function runSimulation() {
  const v0 = parseFloat(document.getElementById('speed').value);
  const angle = parseFloat(document.getElementById('angle').value);
  const mass = parseFloat(document.getElementById('mass').value);
  const y0 = parseFloat(document.getElementById('launchHeight').value);
  const yLanding = parseFloat(document.getElementById('landingHeight').value);
  const airRes = document.getElementById('airResistance').checked;
  const solver = (document.getElementById('solverCanvas')?.value) || document.getElementById('solver').value;
  const dragParams = {
    dragCoeff: parseFloat(document.getElementById('dragCoeff').value),
    area: parseFloat(document.getElementById('area').value),
    airDensity: parseFloat(document.getElementById('airDensity').value),
  };
  const showPred = (document.getElementById('showPredictionCanvas')?.checked) || document.getElementById('showPrediction').checked;
  const airResEffective = (document.getElementById('airResistanceCanvas')?.checked) || airRes;
  let solverToUse = solver;
  if (airResEffective && solver === 'analytic') {
    solverToUse = 'rk4';
    if (document.getElementById('solverCanvas')) document.getElementById('solverCanvas').value = 'rk4';
    if (document.getElementById('solver')) document.getElementById('solver').value = 'rk4';
    const hudSolverEl = document.getElementById('hudSolver');
    if (hudSolverEl) hudSolverEl.textContent = 'rk4';
  }
  let result;
  let prediction = null;
  if (solverToUse === 'analytic') {
    result = analyticSolution(v0, angle, y0, yLanding);
    const vxConst = v0 * Math.cos(degToRad(angle));
    const v0y = v0 * Math.sin(degToRad(angle));
    const velTrace = result.positions.map((pt) => {
      const vy = v0y - g * pt.t;
      const vMag = Math.sqrt(vxConst * vxConst + vy * vy);
      return { t: pt.t, v: vMag };
    });
    result.velocityTrace = velTrace;
  } else if (solverToUse === 'euler') {
    result = eulerSolution(v0, angle, mass, airResEffective, y0, yLanding, dragParams);
    if (showPred) {
      prediction = eulerSolution(v0, angle, mass, false, y0, yLanding, dragParams).positions;
    }
  } else if (solverToUse === 'rk4') {
    result = rk4Solution(v0, angle, mass, airResEffective, y0, yLanding, dragParams);
    if (showPred) {
      prediction = rk4Solution(v0, angle, mass, false, y0, yLanding, dragParams).positions;
    }
  }
  let maxSpeed = 0;
  if (result.velocityTrace && result.velocityTrace.length > 0) {
    maxSpeed = Math.max(...result.velocityTrace.map((v) => v.v));
  }
  document.getElementById('tof').textContent = result.tof.toFixed(2);
  document.getElementById('maxHeight').textContent = result.maxH.toFixed(2);
  document.getElementById('range').textContent = result.range.toFixed(2);
  document.getElementById('maxSpeed').textContent = maxSpeed.toFixed(2);
  if (isPlaying) {
    animateSimulation(result, prediction, yLanding);
  } else {
    drawTrajectory(result.positions, prediction, yLanding);
  }
  plotVelocityGraph(result.velocityTrace || []);
  plotHeightGraph(result.positions || []);
  const accTrace = buildAccelTrace(result.positions);
  plotAccelerationOnHeightCanvas(accTrace);
  lastResult = result;
  lastPrediction = prediction;
  currentYLanding = yLanding;
  updateEquationBox({
    solver: solverToUse,
    airResistance: airResEffective,
    v0,
    angle,
    mass,
    dragCoeff: dragParams.dragCoeff,
    area: dragParams.area,
    airDensity: dragParams.airDensity,
  });
  return result;
}

function bindRangeAndNumber(rangeEl, numberEl, onChange) {
  const syncFromRange = () => { numberEl.value = rangeEl.value; onChange(); };
  const syncFromNumber = () => { rangeEl.value = numberEl.value; onChange(); };
  rangeEl.addEventListener('input', syncFromRange);
  numberEl.addEventListener('input', syncFromNumber);
}

// Game mode and controls kept as-is minimal: only wire the essential launch/reset and selectors
function wireUI() {
  // Quick overlay controls
  if (document.getElementById('showGridCanvas')) {
    document.getElementById('showGridCanvas').addEventListener('change', runSimulation);
  }
  if (document.getElementById('showPredictionCanvas')) {
    document.getElementById('showPredictionCanvas').addEventListener('change', runSimulation);
  }
  if (document.getElementById('airResistanceCanvas')) {
    document.getElementById('airResistanceCanvas').addEventListener('change', () => {
      const leftAir = document.getElementById('airResistance');
      if (leftAir) leftAir.checked = document.getElementById('airResistanceCanvas').checked;
      runSimulation();
    });
  }
  if (document.getElementById('solverCanvas')) {
    document.getElementById('solverCanvas').addEventListener('change', () => {
      const solverLeft = document.getElementById('solver');
      if (solverLeft) solverLeft.value = document.getElementById('solverCanvas').value;
      const hudSolverEl = document.getElementById('hudSolver');
      if (hudSolverEl) hudSolverEl.textContent = document.getElementById('solverCanvas').value;
      runSimulation();
    });
  }
  // No dropdown anymore; both graphs are always rendered
  // Play/pause
  const playPauseBtn = document.getElementById('playPauseBtn');
  if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);

  // Inputs two-way bind + run
  bindRangeAndNumber(document.getElementById('speedRange'), document.getElementById('speed'), runSimulation);
  bindRangeAndNumber(document.getElementById('angleRange'), document.getElementById('angle'), runSimulation);
  bindRangeAndNumber(document.getElementById('massRange'), document.getElementById('mass'), runSimulation);
  bindRangeAndNumber(document.getElementById('launchHeightRange'), document.getElementById('launchHeight'), runSimulation);
  bindRangeAndNumber(document.getElementById('landingHeightRange'), document.getElementById('landingHeight'), runSimulation);
  bindRangeAndNumber(document.getElementById('dragCoeffRange'), document.getElementById('dragCoeff'), runSimulation);
  bindRangeAndNumber(document.getElementById('areaRange'), document.getElementById('area'), runSimulation);
  bindRangeAndNumber(document.getElementById('airDensityRange'), document.getElementById('airDensity'), runSimulation);
  document.getElementById('airResistance').addEventListener('change', runSimulation);
  document.getElementById('solver').addEventListener('change', runSimulation);
  document.getElementById('showPrediction').addEventListener('change', runSimulation);
  document.getElementById('launchBtn').addEventListener('click', runSimulation);
  if (document.getElementById('launchBtnCanvas')) {
    document.getElementById('launchBtnCanvas').addEventListener('click', runSimulation);
  }
  if (document.getElementById('resetBtn')) {
    document.getElementById('resetBtn').addEventListener('click', () => {
      // reset to defaults
      const defaults = {
        speed: 50, angle: 45, mass: 1, launchHeight: 0, landingHeight: 0, airResistance: false, solver: 'analytic', showPrediction: false,
        dragCoeff: 0.47, area: 0.01, airDensity: 1.225,
      };
      Object.entries(defaults).forEach(([k, v]) => {
        const el = document.getElementById(k);
        if (el?.type === 'checkbox') el.checked = v; else if (el) el.value = v;
        const range = document.getElementById(k + 'Range'); if (range) range.value = v;
      });
      runSimulation();
    });
  }
  if (document.getElementById('resetBtnCanvas')) {
    document.getElementById('resetBtnCanvas').addEventListener('click', () => {
      document.getElementById('resetBtn').click();
    });
  }
}

function updateLayoutOnResize() {
  resizeCanvasMain();
  resizeGraphCanvases();
  redrawAllGraphsFromCache();
}

document.addEventListener('DOMContentLoaded', () => {
  initCanvases();
  initializeDOMRefs();
  resizeCanvasMain();
  resizeGraphCanvases();
  window.addEventListener('resize', updateLayoutOnResize);
  // Observe graph container size changes to keep canvas resolution in sync
  const graphsPane = document.getElementById('graphsPane');
  if (window.ResizeObserver && graphsPane) {
    graphsResizeObserver = new ResizeObserver(() => {
      resizeGraphCanvases();
      redrawAllGraphsFromCache();
    });
    graphsResizeObserver.observe(graphsPane);
  }
  wireUI();
  isPlaying = false;
  setPlayUI(false);
  lastResult = runSimulation();
});

