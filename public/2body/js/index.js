import { RENDER, COLLISION } from './constants.js';
import { add, subtract, scale, length, normalize } from './vec2.js';
import { massToRadius, computeCenterOfMass, computeEnergy, computeAngularMomentum, 
         semiImplicitEulerStep, velocityVerletStep, rk4Step, rk45AdaptiveIntegrate, 
         resolveElasticCollision, findTOIConstantVelocity } from './physics.js';
import { draw } from './render.js';
import { buildUIHandles, resizeCanvas, parseNumber, setScenarioOptions } from './ui.js';
import { createStateFromInputs, resetFromInputs, syncInputsToState, applyInputsToState } from './state.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const ui = buildUIHandles(document);

window.addEventListener('resize', () => resizeCanvas(canvas, ctx, ui));
resizeCanvas(canvas, ctx, ui);

let state = createStateFromInputs(ui);

setScenarioOptions(ui);
document.getElementById('loadScenarioBtn').addEventListener('click', () => {
  const sel = ui.scenarioSelect.value;
  if (!sel) return;
  state = window.__SCENARIOS.applyScenario(sel, ui, state);
  resizeCanvas(canvas, ctx, ui);
  if (!state.running) {
    for (const b of state.bodies) b.radius = massToRadius(b.mass);
  }
  draw(ctx, canvas, state);
});

const INTEGRATORS = {
  semi_implicit_euler: (bodies, dt, G, eps, absTol, relTol) => semiImplicitEulerStep(bodies, dt, G, eps),
  rk4: (bodies, dt, G, eps, absTol, relTol) => rk4Step(bodies, dt, G, eps),
  rk45: (bodies, dt, G, eps, absTol, relTol) => rk45AdaptiveIntegrate(bodies, dt, G, eps, absTol, relTol),
  velocity_verlet: (bodies, dt, G, eps, absTol, relTol) => velocityVerletStep(bodies, dt, G, eps),
};

function advanceBy(dtSub) {
  const { G, eps, integrator, absTol, relTol } = state;
  const step = INTEGRATORS[integrator] || INTEGRATORS.velocity_verlet;
  step(state.bodies, dtSub, G, eps, absTol, relTol);
}

function updateRadiiFromMass() {
  for (const body of state.bodies) body.radius = massToRadius(body.mass);
}

function maybeHandleCollisions() {
  if (!state.enableCollisions) return;
  const [b1, b2] = state.bodies;
  const r = subtract(b2.position, b1.position);
  const d = length(r);
  const minDist = b1.radius + b2.radius;
  if (d < minDist) {
    const n = normalize(r);
    const overlap = minDist - d;
    const totalMass = b1.mass + b2.mass;
    b1.position = add(b1.position, scale(n, -overlap * (b2.mass / totalMass)));
    b2.position = add(b2.position, scale(n, overlap * (b1.mass / totalMass)));
    resolveElasticCollision(b1, b2, state.restitution);
  }
}

function integrateStepWithCollisions(dt) {
  if (state.enableCollisions && state.bodies.length === 2) {
    let remaining = dt; let iterations = 0;
    while (remaining > 0 && iterations++ < COLLISION.maxIterations) {
      const [b1, b2] = state.bodies;
      const toi = findTOIConstantVelocity(b1, b2, remaining);
      if (toi != null && toi > 1e-8 && toi < remaining) {
        advanceBy(toi);
        resolveElasticCollision(b1, b2, state.restitution);
        const n = normalize(subtract(b2.position, b1.position));
        b1.position = add(b1.position, scale(n, -COLLISION.separationEpsilon));
        b2.position = add(b2.position, scale(n, COLLISION.separationEpsilon));
        remaining -= toi;
      } else {
        advanceBy(remaining); remaining = 0;
      }
    }
    if (iterations >= COLLISION.maxIterations) maybeHandleCollisions();
  } else {
    advanceBy(dt); maybeHandleCollisions();
  }
}

function detectEscapeStatus() {
  if (state.bodies.length !== 2 || state.escaped) return;
  const [b1, b2] = state.bodies;
  const r12 = subtract(b2.position, b1.position);
  const v12 = subtract(b2.velocity, b1.velocity);
  const r = Math.max(1e-9, Math.hypot(r12.x, r12.y));
  const v2 = v12.x * v12.x + v12.y * v12.y;
  const mu = state.G * (b1.mass + b2.mass);
  const specificEnergy = 0.5 * v2 - mu / r;
  const radialVel = (r12.x * v12.x + r12.y * v12.y) / r;
  if (specificEnergy > 0 && radialVel > 0) state.escaped = true;
}

function updateTrails() {
  if (!state.showTrails) return;
  for (const body of state.bodies) {
    body.trail.push({ x: body.position.x, y: body.position.y });
    if (body.trail.length > state.trailMax) body.trail.shift();
  }
}

function updateMetrics() {
  let kinetic = 0; for (const b of state.bodies) kinetic += 0.5 * b.mass * (b.velocity.x * b.velocity.x + b.velocity.y * b.velocity.y);
  let potential = 0; for (let i = 0; i < state.bodies.length; i++) { for (let j = i + 1; j < state.bodies.length; j++) { const r = subtract(state.bodies[j].position, state.bodies[i].position); const dist = Math.sqrt(r.x * r.x + r.y * r.y + state.eps * state.eps); potential += -state.G * state.bodies[i].mass * state.bodies[j].mass / dist; } }
  const energy = kinetic + potential;
  const angularMomentumZ = computeAngularMomentum(state.bodies);
  const speed1 = Math.hypot(state.bodies[0].velocity.x, state.bodies[0].velocity.y);
  const speed2 = Math.hypot(state.bodies[1].velocity.x, state.bodies[1].velocity.y);
  const separation = Math.hypot(state.bodies[1].position.x - state.bodies[0].position.x, state.bodies[1].position.y - state.bodies[0].position.y);
  const m = state.metrics;
  m.t.push(state.time); m.KE.push(kinetic); m.PE.push(potential); m.E.push(energy); m.Lz.push(angularMomentumZ); m.v1.push(speed1); m.v2.push(speed2); m.r12.push(separation);
  if (m.t.length > m.maxPoints) { m.t.shift(); m.KE.shift(); m.PE.shift(); m.E.shift(); m.Lz.shift(); m.v1.shift(); m.v2.shift(); m.r12.shift(); }
}

function lockCenterOfMassIfEnabled() {
  if (!state.lockCOM) return;
  const com = computeCenterOfMass(state.bodies);
  for (const b of state.bodies) { b.position.x -= com.position.x; b.position.y -= com.position.y; }
  for (const b of state.bodies) { b.velocity.x -= com.velocity.x; b.velocity.y -= com.velocity.y; }
  for (const b of state.bodies) { for (const p of b.trail) { p.x -= com.position.x; p.y -= com.position.y; } }
}

function updateLiveUI() {
  const [b1, b2] = state.bodies;
  if (ui.b1_x_live) ui.b1_x_live.textContent = b1.position.x.toFixed(2);
  if (ui.b1_y_live) ui.b1_y_live.textContent = b1.position.y.toFixed(2);
  if (ui.b1_vx_live) ui.b1_vx_live.textContent = b1.velocity.x.toFixed(3);
  if (ui.b1_vy_live) ui.b1_vy_live.textContent = b1.velocity.y.toFixed(3);
  if (ui.b2_x_live) ui.b2_x_live.textContent = b2.position.x.toFixed(2);
  if (ui.b2_y_live) ui.b2_y_live.textContent = b2.position.y.toFixed(2);
  if (ui.b2_vx_live) ui.b2_vx_live.textContent = b2.velocity.x.toFixed(3);
  if (ui.b2_vy_live) ui.b2_vy_live.textContent = b2.velocity.y.toFixed(3);
  const r12v = subtract(b2.position, b1.position); const v12v = subtract(b2.velocity, b1.velocity);
  const r = Math.max(1e-9, Math.hypot(r12v.x, r12v.y)); const vrel = Math.hypot(v12v.x, v12v.y);
  const mu = state.G * (b1.mass + b2.mass); const vesc = Math.sqrt(2 * mu / r); const eps = 0.5 * vrel * vrel - mu / r; const escaped = eps > 0;
  if (!state.escaped && escaped) { state.escaped = true; state.tEscaped = state.time; }
  if (ui.escapeStatusText) ui.escapeStatusText.textContent = state.escaped ? 'Unbound' : 'Bound';
  if (ui.escapeTimeText) ui.escapeTimeText.textContent = state.tEscaped == null ? '–' : state.tEscaped.toFixed(2);
  if (ui.relativeSpeedText) ui.relativeSpeedText.textContent = vrel.toFixed(3);
  if (ui.escapeSpeedText) ui.escapeSpeedText.textContent = vesc.toFixed(3);
  if (ui.specificEnergyText) ui.specificEnergyText.textContent = eps.toExponential(3);
}

function applyInputsToStateAndResetMetrics() {
  state = applyInputsToState(ui, state, computeEnergy, computeAngularMomentum);
}

['change', 'input'].forEach(evt => {
  [ ui.integrator, ui.G, ui.dt, ui.stepsPerFrame, ui.trailMax, ui.softening, ui.restitution, ui.absTol, ui.relTol,
    ui.showTrails, ui.showCOM, ui.comFrame, ui.enableCollisions, ui.lockCOM,
    ui.showVelocityVectors, ui.showForceVectors, ui.showPositionVectors, ui.showDisplacementVector,
    ui.m1, ui.x1, ui.y1, ui.vx1, ui.vy1, ui.m2, ui.x2, ui.y2, ui.vx2, ui.vy2,
  ].forEach(el => el.addEventListener(evt, () => {
    applyInputsToStateAndResetMetrics();
    updateRadiiFromMass();
    draw(ctx, canvas, state);
    updateLiveUI();
  }));
});

ui.toggleRunBtn.addEventListener('click', () => { state.running = !state.running; ui.toggleRunBtn.textContent = state.running ? 'Pause' : 'Start'; });
ui.resetBtn.addEventListener('click', () => { state = createStateFromInputs(ui); ui.toggleRunBtn.textContent = state.running ? 'Pause' : 'Start'; });
ui.clearTrailsBtn.addEventListener('click', () => { for (const b of state.bodies) b.trail.length = 0; });

(function setupResizer() {
  const resizer = document.getElementById('resizer'); if (!resizer) return;
  let dragging = false; let startX = 0; let startWidth = 0; const root = document.documentElement;
  resizer.addEventListener('mousedown', (e) => { dragging = true; startX = e.clientX; const controlsRect = document.getElementById('controls').getBoundingClientRect(); startWidth = controlsRect.width; e.preventDefault(); });
  window.addEventListener('mousemove', (e) => { if (!dragging) return; const dx = e.clientX - startX; const newWidth = Math.max(240, Math.min(560, Math.round(startWidth + dx))); root.style.setProperty('--sidebar-width', `${newWidth}px`); resizeCanvas(canvas, ctx, ui); });
  window.addEventListener('mouseup', () => { dragging = false; });
})();

let draggingIndex = -1; let dragStart = null; let shiftHeld = false;
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
  const wx = mx - rect.width / 2; const wy = -(my - rect.height / 2);
  for (let i = state.bodies.length - 1; i >= 0; i--) {
    const b = state.bodies[i]; const dx = wx - b.position.x; const dy = wy - b.position.y;
    if (dx * dx + dy * dy <= (b.radius + 4) * (b.radius + 4)) { draggingIndex = i; dragStart = { x: wx, y: wy }; shiftHeld = e.shiftKey; break; }
  }
});
window.addEventListener('mouseup', () => { draggingIndex = -1; dragStart = null; });
window.addEventListener('mousemove', (e) => {
  if (draggingIndex < 0) return; const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
  const wx = mx - rect.width / 2; const wy = -(my - rect.height / 2); const b = state.bodies[draggingIndex];
  if (!shiftHeld) { b.position = { x: wx, y: wy }; b.trail.length = 0; }
  else if (dragStart) { const v = { x: (wx - dragStart.x) * 0.02, y: (wy - dragStart.y) * 0.02 }; b.velocity = v; }
});

function stepSimulation() {
  const { dt } = state;
  for (const b of state.bodies) b.radius = massToRadius(b.mass);
  integrateStepWithCollisions(dt);
  state.time += dt;
  detectEscapeStatus();
  updateTrails();
  updateMetrics();
  lockCenterOfMassIfEnabled();
  updateLiveUI();
}

function loop() {
  for (let i = 0; i < state.stepsPerFrame; i++) { if (state.running) stepSimulation(); }
  draw(ctx, canvas, state);
  requestAnimationFrame(loop);
}
loop();


