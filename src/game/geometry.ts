import type { Rect, Vec2 } from './types';

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function circleIntersectsRect(center: Vec2, radius: number, rect: Rect) {
  const x = clamp(center.x, rect.x, rect.x + rect.width);
  const y = clamp(center.y, rect.y, rect.y + rect.height);
  return (center.x - x) ** 2 + (center.y - y) ** 2 < radius ** 2;
}

export function expandedRect(rect: Rect, amount: number): Rect {
  return {
    x: rect.x - amount, y: rect.y - amount,
    width: rect.width + amount * 2, height: rect.height + amount * 2,
  };
}

export function segmentCircle(from: Vec2, to: Vec2, center: Vec2, radius: number) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const fx = from.x - center.x, fy = from.y - center.y;
  const c = fx * fx + fy * fy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export function segmentRect(from: Vec2, to: Vec2, rect: Rect): number | null {
  let enter = 0, exit = 1;
  for (const axis of ['x', 'y'] as const) {
    const start = from[axis];
    const delta = to[axis] - start;
    const min = rect[axis];
    const max = min + (axis === 'x' ? rect.width : rect.height);
    if (Math.abs(delta) < 1e-12) {
      if (start < min || start > max) return null;
      continue;
    }
    const a = (min - start) / delta, b = (max - start) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return null;
  }
  return enter;
}