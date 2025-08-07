// Physics module: constants and solvers

export const g = 9.81; // gravitational acceleration (m/s^2)

export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

// Analytic solution for no drag with optional initial and landing heights
export function analyticSolution(v0, angle, y0 = 0, yLanding = 0) {
  const rad = degToRad(angle);
  const v0x = v0 * Math.cos(rad);
  const v0y = v0 * Math.sin(rad);
  // Solve quadratic equation for time when projectile hits landing height
  // y(t) = y0 + v0y * t - 0.5 * g * t^2 = yLanding
  // 0.5*g*t^2 - v0y*t + (yLanding - y0) = 0
  const a = 0.5 * g;
  const b = -v0y;
  const c = yLanding - y0;
  const discriminant = b * b - 4 * a * c;
  let tof;
  if (discriminant < 0) {
    tof = 0;
  } else {
    const sqrtD = Math.sqrt(discriminant);
    // positive root
    const t1 = (-b + sqrtD) / (2 * a);
    const t2 = (-b - sqrtD) / (2 * a);
    tof = Math.max(t1, t2);
  }
  // maximum height
  const maxH = y0 + (v0y * v0y) / (2 * g);
  // range
  const range = v0x * tof;
  // Generate positions over time for drawing
  const numSteps = 300;
  const dt = tof / numSteps || 0.01;
  const positions = [];
  for (let i = 0; i <= numSteps; i++) {
    const t = dt * i;
    const x = v0x * t;
    const y = y0 + v0y * t - 0.5 * g * t * t;
    positions.push({ x, y, t });
  }
  return { positions, tof, maxH, range };
}

// Euler integration for optional drag with initial and landing heights
export function eulerSolution(
  v0,
  angle,
  mass,
  airResistance,
  y0 = 0,
  yLanding = 0,
  params = {}
) {
  const rad = degToRad(angle);
  const dt = 0.01; // step size
  let t = 0;
  const positions = [];
  // initial velocities
  let vx = v0 * Math.cos(rad);
  let vy = v0 * Math.sin(rad);
  let x = 0;
  let y = y0;
  let maxH = y0;
  const velocityTrace = [];
  const airDensity = params.airDensity ?? 1.225; // kg/m^3
  const dragCoeff = params.dragCoeff ?? 0.47; // sphere
  const area = params.area ?? 0.01; // m^2 cross-section area (approx.)
  const c = 0.5 * airDensity * dragCoeff * area;
  let prevY = y;
  while (t < 100) {
    // record position
    positions.push({ x, y, t });
    const v = Math.sqrt(vx * vx + vy * vy);
    velocityTrace.push({ t, v });
    // update max height
    if (y > maxH) maxH = y;
    // compute drag force components if enabled
    let axDrag = 0;
    let ayDrag = 0;
    if (airResistance) {
      if (v !== 0) {
        // Drag acceleration: a_drag = (c/m) * v * v direction
        axDrag = -(c / mass) * v * vx;
        ayDrag = -(c / mass) * v * vy;
      }
    }
    // update acceleration due to gravity and drag
    const ax = axDrag;
    const ay = -g + ayDrag;
    // update velocities
    vx += ax * dt;
    vy += ay * dt;
    // update positions
    x += vx * dt;
    y += vy * dt;
    t += dt;
    // stop when we cross the landing height while descending
    if ((prevY - yLanding) * (y - yLanding) <= 0 && vy < 0) {
      break;
    }
    prevY = y;
  }
  const tof = t;
  const range = x;
  return { positions, tof, maxH, range, velocityTrace };
}

// Runge-Kutta 4th order for drag or no drag with initial and landing heights
export function rk4Solution(
  v0,
  angle,
  mass,
  airResistance,
  y0 = 0,
  yLanding = 0,
  params = {}
) {
  const rad = degToRad(angle);
  const dt = 0.01;
  let t = 0;
  let x = 0;
  let y = y0;
  let vx = v0 * Math.cos(rad);
  let vy = v0 * Math.sin(rad);
  const positions = [];
  const velocityTrace = [];
  let maxH = 0;
  const airDensity = params.airDensity ?? 1.225;
  const dragCoeff = params.dragCoeff ?? 0.47;
  const area = params.area ?? 0.01;
  const c = 0.5 * airDensity * dragCoeff * area;
  // Helper to compute derivatives
  function deriv(state) {
    const [x, y, vx, vy] = state;
    const v = Math.sqrt(vx * vx + vy * vy);
    let axDrag = 0;
    let ayDrag = 0;
    if (airResistance && v !== 0) {
      axDrag = -(c / mass) * v * vx;
      ayDrag = -(c / mass) * v * vy;
    }
    const ax = axDrag;
    const ay = -g + ayDrag;
    return [vx, vy, ax, ay];
  }
  let prevY = y;
  while (t < 100) {
    positions.push({ x, y, t });
    const v = Math.sqrt(vx * vx + vy * vy);
    velocityTrace.push({ t, v });
    if (y > maxH) maxH = y;
    // RK4 integration step
    const state = [x, y, vx, vy];
    const k1 = deriv(state);
    const k2 = deriv([
      x + 0.5 * dt * k1[0],
      y + 0.5 * dt * k1[1],
      vx + 0.5 * dt * k1[2],
      vy + 0.5 * dt * k1[3],
    ]);
    const k3 = deriv([
      x + 0.5 * dt * k2[0],
      y + 0.5 * dt * k2[1],
      vx + 0.5 * dt * k2[2],
      vy + 0.5 * dt * k2[3],
    ]);
    const k4 = deriv([
      x + dt * k3[0],
      y + dt * k3[1],
      vx + dt * k3[2],
      vy + dt * k3[3],
    ]);
    x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    vx += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    vy += (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
    t += dt;
    if ((prevY - yLanding) * (y - yLanding) <= 0 && vy < 0) {
      break;
    }
    prevY = y;
  }
  const tof = t;
  const range = x;
  return { positions, tof, maxH, range, velocityTrace };
}

