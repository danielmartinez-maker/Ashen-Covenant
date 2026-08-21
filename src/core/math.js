export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (from, to, t) => from + (to - from) * t;
export const invLerp = (from, to, value) => (value - from) / (to - from);
export const remap = (value, fromA, toA, fromB, toB) => lerp(fromB, toB, clamp(invLerp(fromA, toA, value), 0, 1));
export const length = (x, y) => Math.hypot(x, y);
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const sqDistance = (a, b) => {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return x * x + y * y;
};
export const normalize = (x, y) => {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};
export const angleTo = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
export const fromAngle = (angle, magnitude = 1) => ({ x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude });
export const wrapAngle = (angle) => {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const choose = (items, random = Math.random) => items[Math.floor(random() * items.length)];
export const range = (min, max, random = Math.random) => min + (max - min) * random();
export const hash = (value) => {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
export const seeded = (seed) => {
  let state = hash(String(seed)) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};
