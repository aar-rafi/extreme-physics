export function subtract(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
export function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
export function scale(a, s) { return { x: a.x * s, y: a.y * s }; }
export function dot(a, b) { return a.x * b.x + a.y * b.y; }
export function length(v) { return Math.hypot(v.x, v.y); }
export function normalize(v) {
  const L = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / L, y: v.y / L };
}


