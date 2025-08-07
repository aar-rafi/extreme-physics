export function buildUIHandles(document) {
  return {
    scenarioSelect: document.getElementById('scenarioSelect'),
    toggleRunBtn: document.getElementById('toggleRunBtn'),
    resetBtn: document.getElementById('resetBtn'),
    clearTrailsBtn: document.getElementById('clearTrailsBtn'),
    integrator: document.getElementById('integrator'),
    G: document.getElementById('gravitationalConstant'),
    dt: document.getElementById('timeStep'),
    stepsPerFrame: document.getElementById('speedMultiplier'),
    trailMax: document.getElementById('trailMax'),
    softening: document.getElementById('softening'),
    showTrails: document.getElementById('showTrails'),
    showCOM: document.getElementById('showCenterOfMass'),
    comFrame: document.getElementById('renderCOMFrame'),
    enableCollisions: document.getElementById('enableCollisions'),
    lockCOM: document.getElementById('lockCOM'),
    restitution: document.getElementById('restitution'),
    showVelocityVectors: document.getElementById('showVelocityVectors'),
    showForceVectors: document.getElementById('showForceVectors'),
    showPositionVectors: document.getElementById('showPositionVectors'),
    showDisplacementVector: document.getElementById('showDisplacementVector'),
    livePanel: document.getElementById('livePanel'),
    b1_x_live: document.getElementById('b1_x_live'),
    b1_y_live: document.getElementById('b1_y_live'),
    b1_vx_live: document.getElementById('b1_vx_live'),
    b1_vy_live: document.getElementById('b1_vy_live'),
    b2_x_live: document.getElementById('b2_x_live'),
    b2_y_live: document.getElementById('b2_y_live'),
    b2_vx_live: document.getElementById('b2_vx_live'),
    b2_vy_live: document.getElementById('b2_vy_live'),
    escapeStatusText: document.getElementById('escapeStatusText'),
    escapeTimeText: document.getElementById('escapeTimeText'),
    relativeSpeedText: document.getElementById('relativeSpeedText'),
    escapeSpeedText: document.getElementById('escapeSpeedText'),
    specificEnergyText: document.getElementById('specificEnergyText'),
    absTol: document.getElementById('absTol'),
    relTol: document.getElementById('relTol'),
    m1: document.getElementById('m1'), x1: document.getElementById('x1'), y1: document.getElementById('y1'), vx1: document.getElementById('vx1'), vy1: document.getElementById('vy1'),
    m2: document.getElementById('m2'), x2: document.getElementById('x2'), y2: document.getElementById('y2'), vx2: document.getElementById('vx2'), vy2: document.getElementById('vy2'),
  };
}

export function resizeCanvas(canvas, ctx, ui) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (ui.livePanel) ui.livePanel.style.display = 'block';
}

export function parseNumber(inputEl, fallback) {
  const v = Number(inputEl.value);
  return Number.isFinite(v) ? v : fallback;
}

export function setScenarioOptions(ui) {
  const options = [
    { id: 'circular_orbit', name: 'Circular Orbit (Kepler)', desc: 'B2 orbits B1 with v = sqrt(GM/r).' },
    { id: 'elliptic_orbit', name: 'Elliptical Orbit', desc: 'B2 in bound ellipse with e ~ 0.6.' },
    { id: 'hyperbolic_flyby', name: 'Hyperbolic Flyby', desc: 'Unbound flyby with ε > 0.' },
    { id: 'head_on_collision', name: 'Head-on Collision', desc: 'Direct approach with collision and bounce.' },
    { id: 'equal_mass_binary', name: 'Equal Mass Binary', desc: 'Two equal masses orbiting COM.' },
  ];
  const sel = ui.scenarioSelect;
  if (!sel) return;
  sel.innerHTML = options.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
  const descEl = document.getElementById('scenarioDesc');
  const updateDesc = () => { const o = options.find(x => x.id === sel.value); if (descEl && o) descEl.textContent = o.desc; };
  sel.addEventListener('change', updateDesc);
  updateDesc();
  // expose for loader usage
  window.__SCENARIO_META = options.reduce((m, o) => (m[o.id] = o, m), {});
}

