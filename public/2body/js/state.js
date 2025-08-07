import { parseNumber } from './ui.js';

export function createStateFromInputs(ui) {
  return {
    integrator: (ui.integrator && ui.integrator.value) || 'velocity_verlet',
    G: parseNumber(ui.G, 1),
    dt: parseNumber(ui.dt, 0.1),
    stepsPerFrame: Math.max(1, Math.floor(parseNumber(ui.stepsPerFrame, 1))),
    trailMax: Math.max(10, Math.floor(parseNumber(ui.trailMax, 1000))),
    eps: parseNumber(ui.softening, 0) || 0,
    showTrails: !!ui.showTrails.checked,
    showCOM: !!ui.showCOM.checked,
    comFrame: !!ui.comFrame.checked,
    enableCollisions: !!ui.enableCollisions.checked,
    lockCOM: !!ui.lockCOM.checked,
    restitution: Math.min(1, Math.max(0, parseNumber(ui.restitution, 1))),
    showVelocityVectors: !!ui.showVelocityVectors?.checked,
    showForceVectors: !!ui.showForceVectors?.checked,
    showPositionVectors: !!ui.showPositionVectors?.checked,
    showDisplacementVector: !!ui.showDisplacementVector?.checked,
    absTol: Math.max(0, parseNumber(ui.absTol, 1e-5)),
    relTol: Math.max(0, parseNumber(ui.relTol, 1e-5)),
    bodies: [
      { mass: Math.max(0.0001, parseNumber(ui.m1, 10)), position: { x: parseNumber(ui.x1, -150), y: parseNumber(ui.y1, 0) }, velocity: { x: parseNumber(ui.vx1, 0), y: parseNumber(ui.vy1, -0.5) }, radius: 8, trail: [], color: '#7fda89' },
      { mass: Math.max(0.0001, parseNumber(ui.m2, 1)), position: { x: parseNumber(ui.x2, 150), y: parseNumber(ui.y2, 0) }, velocity: { x: parseNumber(ui.vx2, 0), y: parseNumber(ui.vy2, 1.58) }, radius: 6, trail: [], color: '#3aa0ff' },
    ],
    running: false,
    time: 0,
    energy0: null,
    angularMomentum0: null,
    metrics: { t: [], KE: [], PE: [], E: [], Lz: [], v1: [], v2: [], r12: [], maxPoints: 1500 },
    escaped: false,
    tEscaped: null,
  };
}

export function resetFromInputs(ui, prevState) {
  const running = prevState.running;
  const newState = createStateFromInputs(ui);
  newState.running = running;
  return newState;
}

export function syncInputsToState(ui, state) {
  if (ui.integrator) ui.integrator.value = String(state.integrator);
  ui.G.value = String(state.G);
  ui.dt.value = String(state.dt);
  ui.stepsPerFrame.value = String(state.stepsPerFrame);
  ui.trailMax.value = String(state.trailMax);
  ui.softening.value = String(state.eps);
  ui.showTrails.checked = state.showTrails;
  ui.showCOM.checked = state.showCOM;
  ui.comFrame.checked = state.comFrame;
  ui.enableCollisions.checked = state.enableCollisions;
  ui.lockCOM.checked = state.lockCOM;
  ui.restitution.value = String(state.restitution);
  ui.absTol.value = String(state.absTol);
  ui.relTol.value = String(state.relTol);
  if (ui.showVelocityVectors) ui.showVelocityVectors.checked = !!state.showVelocityVectors;
  if (ui.showForceVectors) ui.showForceVectors.checked = !!state.showForceVectors;
  if (ui.showPositionVectors) ui.showPositionVectors.checked = !!state.showPositionVectors;
  if (ui.showDisplacementVector) ui.showDisplacementVector.checked = !!state.showDisplacementVector;
  const [b1, b2] = state.bodies;
  ui.m1.value = String(b1.mass);
  ui.x1.value = String(b1.position.x);
  ui.y1.value = String(b1.position.y);
  ui.vx1.value = String(b1.velocity.x);
  ui.vy1.value = String(b1.velocity.y);
  ui.m2.value = String(b2.mass);
  ui.x2.value = String(b2.position.x);
  ui.y2.value = String(b2.position.y);
  ui.vx2.value = String(b2.velocity.x);
  ui.vy2.value = String(b2.velocity.y);
}

export function applyInputsToState(ui, state, computeEnergy, computeAngularMomentum) {
  const wasRunning = state.running;
  const newState = createStateFromInputs(ui);
  newState.running = wasRunning;
  for (const b of newState.bodies) b.trail.length = 0;
  newState.energy0 = computeEnergy(newState.bodies, newState.G, newState.eps);
  newState.angularMomentum0 = computeAngularMomentum(newState.bodies);
  newState.metrics.t.length = 0;
  newState.metrics.KE.length = 0;
  newState.metrics.PE.length = 0;
  newState.metrics.E.length = 0;
  newState.metrics.Lz.length = 0;
  newState.metrics.v1.length = 0;
  newState.metrics.v2.length = 0;
  newState.metrics.r12.length = 0;
  newState.escaped = false;
  return newState;
}

