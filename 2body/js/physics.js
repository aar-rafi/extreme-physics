import { add, subtract, scale, dot, normalize } from './vec2.js';

export function massToRadius(mass) {
  const baseRadius = 3;
  const s = 10;
  const safe = Math.max(1e-6, mass);
  return baseRadius + Math.log10(1 + safe) * s;
}

export function computeAccelerations(bodies, G, eps) {
  const acc = bodies.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < bodies.length; i++) {
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      const r = subtract(bodies[j].position, bodies[i].position);
      const soft2 = eps * eps;
      const distSqr = Math.max(1e-12, r.x * r.x + r.y * r.y + soft2);
      const invDist = 1 / Math.sqrt(distSqr);
      const invDist3 = invDist * invDist * invDist;
      const f = G * bodies[j].mass * invDist3;
      acc[i].x += r.x * f;
      acc[i].y += r.y * f;
    }
  }
  return acc;
}

export function semiImplicitEulerStep(bodies, dt, G, eps) {
  const A = computeAccelerations(bodies, G, eps);
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].velocity.x += A[i].x * dt;
    bodies[i].velocity.y += A[i].y * dt;
    bodies[i].position.x += bodies[i].velocity.x * dt;
    bodies[i].position.y += bodies[i].velocity.y * dt;
  }
}

export function velocityVerletStep(bodies, dt, G, eps) {
  const A0 = computeAccelerations(bodies, G, eps);
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].position.x += bodies[i].velocity.x * dt + 0.5 * A0[i].x * dt * dt;
    bodies[i].position.y += bodies[i].velocity.y * dt + 0.5 * A0[i].y * dt * dt;
  }
  const A1 = computeAccelerations(bodies, G, eps);
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].velocity.x += 0.5 * (A0[i].x + A1[i].x) * dt;
    bodies[i].velocity.y += 0.5 * (A0[i].y + A1[i].y) * dt;
  }
}

export function rk4Step(bodies, dt, G, eps) {
  const P0 = bodies.map(b => ({ x: b.position.x, y: b.position.y }));
  const V0 = bodies.map(b => ({ x: b.velocity.x, y: b.velocity.y }));
  const A1 = computeAccelerations(bodies, G, eps);
  const k1P = V0.map(v => scale(v, dt));
  const k1V = A1.map(a => scale(a, dt));
  const B2 = bodies.map((b, i) => ({ mass: b.mass, position: add(P0[i], scale(k1P[i], 0.5)), velocity: add(V0[i], scale(k1V[i], 0.5)) }));
  const A2 = computeAccelerations(B2, G, eps);
  const k2P = B2.map(b => scale(b.velocity, dt));
  const k2V = A2.map(a => scale(a, dt));
  const B3 = bodies.map((b, i) => ({ mass: b.mass, position: add(P0[i], scale(k2P[i], 0.5)), velocity: add(V0[i], scale(k2V[i], 0.5)) }));
  const A3 = computeAccelerations(B3, G, eps);
  const k3P = B3.map(b => scale(b.velocity, dt));
  const k3V = A3.map(a => scale(a, dt));
  const B4 = bodies.map((b, i) => ({ mass: b.mass, position: add(P0[i], k3P[i]), velocity: add(V0[i], k3V[i]) }));
  const A4 = computeAccelerations(B4, G, eps);
  const k4P = B4.map(b => scale(b.velocity, dt));
  const k4V = A4.map(a => scale(a, dt));
  for (let i = 0; i < bodies.length; i++) {
    const dP = scale(add(add(k1P[i], scale(add(k2P[i], k3P[i]), 2)), k4P[i]), 1 / 6);
    const dV = scale(add(add(k1V[i], scale(add(k2V[i], k3V[i]), 2)), k4V[i]), 1 / 6);
    bodies[i].position = add(bodies[i].position, dP);
    bodies[i].velocity = add(bodies[i].velocity, dV);
  }
}

export function rk45AdaptiveIntegrate(bodies, dt, G, eps, absTol, relTol) {
  const safety = 0.9, minScale = 0.2, maxScale = 5.0;
  let remaining = dt;
  let h = Math.min(dt, Math.max(1e-6, dt * 0.5));
  const N = bodies.length;
  const snapshot = () => bodies.map(b => ({ mass: b.mass, position: { x: b.position.x, y: b.position.y }, velocity: { x: b.velocity.x, y: b.velocity.y }, radius: b.radius, trail: b.trail, color: b.color }));
  const restore = (copy) => { for (let i = 0; i < bodies.length; i++) { bodies[i].position.x = copy[i].position.x; bodies[i].position.y = copy[i].position.y; bodies[i].velocity.x = copy[i].velocity.x; bodies[i].velocity.y = copy[i].velocity.y; } };
  function scaleVecArray(a, s) { const out = new Array(a.length); for (let i = 0; i < a.length; i++) out[i] = { x: a[i].x * s, y: a[i].y * s }; return out; }
  function rk45Once(hStep) {
    const P0 = bodies.map(b => ({ x: b.position.x, y: b.position.y }));
    const V0 = bodies.map(b => ({ x: b.velocity.x, y: b.velocity.y }));
    const A1 = computeAccelerations(bodies, G, eps);
    const k1P = scaleVecArray(V0, hStep);
    const k1V = scaleVecArray(A1, hStep);
    const B2 = snapshot();
    for (let i = 0; i < N; i++) { B2[i].position = add(P0[i], scale(k1P[i], 1/5)); B2[i].velocity = add(V0[i], scale(k1V[i], 1/5)); }
    const A2 = computeAccelerations(B2, G, eps);
    const k2P = scaleVecArray(B2.map(b => b.velocity), hStep);
    const k2V = scaleVecArray(A2, hStep);
    const B3 = snapshot();
    for (let i = 0; i < N; i++) { B3[i].position = add(P0[i], add(scale(k1P[i], 3/40), scale(k2P[i], 9/40))); B3[i].velocity = add(V0[i], add(scale(k1V[i], 3/40), scale(k2V[i], 9/40))); }
    const A3 = computeAccelerations(B3, G, eps);
    const k3P = scaleVecArray(B3.map(b => b.velocity), hStep);
    const k3V = scaleVecArray(A3, hStep);
    const B4 = snapshot();
    for (let i = 0; i < N; i++) { B4[i].position = add(P0[i], add(add(scale(k1P[i], 44/45), scale(k2P[i], -56/15)), scale(k3P[i], 32/9))); B4[i].velocity = add(V0[i], add(add(scale(k1V[i], 44/45), scale(k2V[i], -56/15)), scale(k3V[i], 32/9))); }
    const A4 = computeAccelerations(B4, G, eps);
    const k4P = scaleVecArray(B4.map(b => b.velocity), hStep);
    const k4V = scaleVecArray(A4, hStep);
    const B5 = snapshot();
    for (let i = 0; i < N; i++) { B5[i].position = add(P0[i], add(add(add(scale(k1P[i], 19372/6561), scale(k2P[i], -25360/2187)), scale(k3P[i], 64448/6561)), scale(k4P[i], -212/729))); B5[i].velocity = add(V0[i], add(add(add(scale(k1V[i], 19372/6561), scale(k2V[i], -25360/2187)), scale(k3V[i], 64448/6561)), scale(k4V[i], -212/729))); }
    const A5 = computeAccelerations(B5, G, eps);
    const k5P = scaleVecArray(B5.map(b => b.velocity), hStep);
    const k5V = scaleVecArray(A5, hStep);
    const B6 = snapshot();
    for (let i = 0; i < N; i++) { B6[i].position = add(P0[i], add(add(add(add(scale(k1P[i], 9017/3168), scale(k2P[i], -355/33)), scale(k3P[i], 46732/5247)), scale(k4P[i], 49/176)), scale(k5P[i], -5103/18656))); B6[i].velocity = add(V0[i], add(add(add(add(scale(k1V[i], 9017/3168), scale(k2V[i], -355/33)), scale(k3V[i], 46732/5247)), scale(k4V[i], 49/176)), scale(k5V[i], -5103/18656))); }
    const A6 = computeAccelerations(B6, G, eps);
    const k6P = scaleVecArray(B6.map(b => b.velocity), hStep);
    const k6V = scaleVecArray(A6, hStep);
    const bP = [35/384, 0, 500/1113, 125/192, -2187/6784, 11/84];
    const bV = bP;
    const P5 = new Array(N), V5 = new Array(N);
    for (let i = 0; i < N; i++) {
      P5[i] = { x: P0[i].x + hStep * (bP[0]*V0[i].x + bP[2]*B3[i].velocity.x + bP[3]*B4[i].velocity.x + bP[4]*B5[i].velocity.x + bP[5]*B6[i].velocity.x), y: P0[i].y + hStep * (bP[0]*V0[i].y + bP[2]*B3[i].velocity.y + bP[3]*B4[i].velocity.y + bP[4]*B5[i].velocity.y + bP[5]*B6[i].velocity.y) };
      V5[i] = { x: V0[i].x + hStep * (bV[0]*A1[i].x + bV[2]*A3[i].x + bV[3]*A4[i].x + bV[4]*A5[i].x + bV[5]*A6[i].x), y: V0[i].y + hStep * (bV[0]*A1[i].y + bV[2]*A3[i].y + bV[3]*A4[i].y + bV[4]*A5[i].y + bV[5]*A6[i].y) };
    }
    // Error norm estimate (approximate, acceptable for control)
    let errNorm = 0;
    for (let i = 0; i < N; i++) {
      const scP = absTol + Math.max(Math.abs(P0[i].x), Math.abs(P5[i].x)) * relTol;
      const scV = absTol + Math.max(Math.abs(V0[i].x), Math.abs(V5[i].x)) * relTol;
      const dx = (P5[i].x - bodies[i].position.x);
      const dy = (P5[i].y - bodies[i].position.y);
      const dvx = (V5[i].x - V0[i].x);
      const dvy = (V5[i].y - V0[i].y);
      const e = Math.sqrt((dx/scP)*(dx/scP) + (dy/scP)*(dy/scP) + (dvx/scV)*(dvx/scV) + (dvy/scV)*(dvy/scV)) / Math.sqrt(4);
      errNorm = Math.max(errNorm, e);
    }
    for (let i = 0; i < N; i++) { bodies[i].position.x = P5[i].x; bodies[i].position.y = P5[i].y; bodies[i].velocity.x = V5[i].x; bodies[i].velocity.y = V5[i].y; }
    return errNorm;
  }
  while (remaining > 0) {
    const copy = snapshot();
    const hTry = Math.min(h, remaining);
    const err = rk45Once(hTry);
    if (err === 0 || err < 1) {
      remaining -= hTry;
      const scaleUp = safety * Math.pow(Math.max(err, 1e-12), -0.2);
      h = Math.min(hTry * Math.max(minScale, Math.min(maxScale, scaleUp)), remaining);
    } else {
      restore(copy);
      const scaleDown = safety * Math.pow(err, -0.25);
      h = Math.max(hTry * Math.max(minScale, Math.min(1, scaleDown)), 1e-8);
    }
  }
}

export function computeCenterOfMass(bodies) {
  let totalMass = 0;
  const cm = { x: 0, y: 0 };
  const cv = { x: 0, y: 0 };
  for (const b of bodies) {
    totalMass += b.mass;
    cm.x += b.position.x * b.mass;
    cm.y += b.position.y * b.mass;
    cv.x += b.velocity.x * b.mass;
    cv.y += b.velocity.y * b.mass;
  }
  if (totalMass > 0) {
    cm.x /= totalMass; cm.y /= totalMass;
    cv.x /= totalMass; cv.y /= totalMass;
  }
  return { position: cm, velocity: cv, totalMass };
}

export function resolveElasticCollision(b1, b2, restitution) {
  const r = subtract(b2.position, b1.position);
  const dist = Math.hypot(r.x, r.y);
  if (dist <= 1e-8) return;
  const n = scale(r, 1 / dist);
  const m1 = b1.mass, m2 = b2.mass;
  const u1n = dot(b1.velocity, n), u2n = dot(b2.velocity, n);
  const approaching = (u1n - u2n) > 0;
  if (!approaching) return;
  const v1t = subtract(b1.velocity, scale(n, u1n));
  const v2t = subtract(b2.velocity, scale(n, u2n));
  const e = Math.min(1, Math.max(0, restitution));
  const v1nPrime = (m1*u1n + m2*u2n - m2*e*(u1n - u2n)) / (m1 + m2);
  const v2nPrime = (m1*u1n + m2*u2n + m1*e*(u1n - u2n)) / (m1 + m2);
  b1.velocity = add(v1t, scale(n, v1nPrime));
  b2.velocity = add(v2t, scale(n, v2nPrime));
}

export function findTOIConstantVelocity(b1, b2, dt) {
  const r0 = subtract(b2.position, b1.position);
  const vrel = subtract(b2.velocity, b1.velocity);
  const R = (b1.radius + b2.radius);
  const a = dot(vrel, vrel);
  const b = 2 * dot(r0, vrel);
  const c = dot(r0, r0) - R * R;
  if (a <= 1e-12) return null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  let tHit = Number.POSITIVE_INFINITY;
  if (t1 > 1e-8 && t1 <= dt) tHit = Math.min(tHit, t1);
  if (t2 > 1e-8 && t2 <= dt) tHit = Math.min(tHit, t2);
  if (!Number.isFinite(tHit) || tHit === Number.POSITIVE_INFINITY) return null;
  if (dot(r0, vrel) >= 0) return null;
  return tHit;
}

export function computeEnergy(bodies, G, eps) {
  let KE = 0, PE = 0;
  for (const b of bodies) KE += 0.5 * b.mass * (b.velocity.x * b.velocity.x + b.velocity.y * b.velocity.y);
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const r = subtract(bodies[j].position, bodies[i].position);
      const dist = Math.sqrt(r.x * r.x + r.y * r.y + eps * eps);
      PE += -G * bodies[i].mass * bodies[j].mass / dist;
    }
  }
  return KE + PE;
}

export function computeAngularMomentum(bodies) {
  let Lz = 0;
  for (const b of bodies) Lz += b.mass * (b.position.x * b.velocity.y - b.position.y * b.velocity.x);
  return Lz;
}

// Scenario helpers generate body states and suggested inputs
export const SCENARIOS = {
  circular_orbit: (ui, state) => {
    const M = 20; const r = 200; const G = 1;
    const v = Math.sqrt(G * M / r);
    return {
      ...state,
      G,
      integrator: 'velocity_verlet', dt: 0.05, stepsPerFrame: 2,
      bodies: [
        { mass: M, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, radius: 8, trail: [], color: '#7fda89' },
        { mass: 1, position: { x: r, y: 0 }, velocity: { x: 0, y: v }, radius: 6, trail: [], color: '#3aa0ff' },
      ],
      escaped: false, tEscaped: null,
    };
  },
  elliptic_orbit: (ui, state) => {
    const M = 10; const r = 220; const e = 0.6; const G = 1;
    // Periapsis rp = a(1-e). Choose v at periapsis: vp = sqrt(GM(1+e)/rp)
    const rp = r * (1 - e); const vp = Math.sqrt(G * M * (1 + e) / rp);
    return {
      ...state, G, integrator: 'velocity_verlet', dt: 0.05, stepsPerFrame: 2,
      bodies: [
        { mass: M, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, radius: 8, trail: [], color: '#7fda89' },
        { mass: 1, position: { x: rp, y: 0 }, velocity: { x: 0, y: vp }, radius: 6, trail: [], color: '#3aa0ff' },
      ], escaped: false, tEscaped: null,
    };
  },
  hyperbolic_flyby: (ui, state) => {
    const M = 20; const G = 1; const b = 300; // impact parameter
    return {
      ...state, G, integrator: 'rk45', absTol: 1e-6, relTol: 1e-6, dt: 0.2, stepsPerFrame: 1,
      bodies: [
        { mass: M, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, radius: 8, trail: [], color: '#7fda89' },
        { mass: 1, position: { x: -600, y: b }, velocity: { x: 3.5, y: 0 }, radius: 6, trail: [], color: '#3aa0ff' },
      ], escaped: false, tEscaped: null,
    };
  },
  head_on_collision: (ui, state) => {
    return {
      ...state, integrator: 'velocity_verlet', dt: 0.05, stepsPerFrame: 2, enableCollisions: true, restitution: 0.8,
      bodies: [
        { mass: 5, position: { x: -150, y: 0 }, velocity: { x: 1.2, y: 0 }, radius: 8, trail: [], color: '#7fda89' },
        { mass: 5, position: { x: 150, y: 0 }, velocity: { x: -1.2, y: 0 }, radius: 8, trail: [], color: '#3aa0ff' },
      ], escaped: false, tEscaped: null,
    };
  },
  equal_mass_binary: (ui, state) => {
    const m = 5; const r = 160; const G = 1; // each orbits at r about COM, opposite sides
    const v = Math.sqrt(G * (2*m) / (2*r)); // each sees total mass, distance 2r between
    return {
      ...state, G, integrator: 'velocity_verlet', dt: 0.05, stepsPerFrame: 2,
      bodies: [
        { mass: m, position: { x: -r, y: 0 }, velocity: { x: 0, y: -v }, radius: 8, trail: [], color: '#7fda89' },
        { mass: m, position: { x: r, y: 0 }, velocity: { x: 0, y: v }, radius: 8, trail: [], color: '#3aa0ff' },
      ], escaped: false, tEscaped: null,
    };
  },
};

// Expose simple scenario loader for index.js
window.__SCENARIOS = {
  applyScenario: (id, ui, prev) => {
    const fn = SCENARIOS[id]; if (!fn) return prev;
    const next = fn(ui, prev);
    // Update UI inputs to reflect scenario
    const [b1, b2] = next.bodies;
    if (ui.G) ui.G.value = String(next.G ?? 1);
    if (ui.integrator) ui.integrator.value = String(next.integrator);
    if (ui.dt) ui.dt.value = String(next.dt);
    if (ui.stepsPerFrame) ui.stepsPerFrame.value = String(next.stepsPerFrame);
    if (ui.m1) ui.m1.value = String(b1.mass);
    if (ui.x1) ui.x1.value = String(b1.position.x);
    if (ui.y1) ui.y1.value = String(b1.position.y);
    if (ui.vx1) ui.vx1.value = String(b1.velocity.x);
    if (ui.vy1) ui.vy1.value = String(b1.velocity.y);
    if (ui.m2) ui.m2.value = String(b2.mass);
    if (ui.x2) ui.x2.value = String(b2.position.x);
    if (ui.y2) ui.y2.value = String(b2.position.y);
    if (ui.vx2) ui.vx2.value = String(b2.velocity.x);
    if (ui.vy2) ui.vy2.value = String(b2.velocity.y);
    // Recompute radii and baselines
    for (const b of next.bodies) b.radius = massToRadius(b.mass);
    next.energy0 = computeEnergy(next.bodies, next.G, next.eps);
    next.angularMomentum0 = computeAngularMomentum(next.bodies);
    next.metrics = { t: [], KE: [], PE: [], E: [], Lz: [], v1: [], v2: [], r12: [], maxPoints: 1500 };
    next.time = 0; next.escaped = false; next.tEscaped = null;
    return next;
  }
}

