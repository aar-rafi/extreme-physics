// Human-readable equation strings for the UI
import { g, degToRad } from './physics.js';

function formatNumber(n, digits = 2) {
  if (!isFinite(n)) return '—';
  return Number(n).toFixed(digits);
}

// Returns a LaTeX-like plain string describing acceleration vs time based on solver
export function buildAccelerationEquation({
  solver,
  airResistance,
  v0,
  angleDeg,
  mass,
  dragCoeff,
  area,
  airDensity,
}) {
  const angleRad = degToRad(angleDeg);
  const v0x = v0 * Math.cos(angleRad);
  const v0y = v0 * Math.sin(angleRad);

  if (!airResistance || solver === 'analytic') {
    // No drag: ax(t)=0, ay(t) = -g
    return `No drag: ax(t) = 0, ay(t) = -${formatNumber(g, 2)} m/s^2`;
  }

  // With drag (quadratic, isotropic): a = -g y_hat - (c/m) |v| v
  const c = 0.5 * airDensity * dragCoeff * area;
  return `With drag: a(t) = (-(c/m)|v|vx, -g -(c/m)|v|vy), where c = 0.5·ρ·Cd·A = ${formatNumber(
    c,
    3
  )}, m = ${formatNumber(mass, 2)}`;
}

