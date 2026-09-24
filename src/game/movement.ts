import type { GameConfig } from './config';
import type { Ship, Vec2 } from './types';
import { circleIntersectsRect, clamp } from './geometry';

export function moveShip(ship: Ship, distance: number, config: GameConfig) {
  const subdivisions = Math.max(1, Math.ceil(Math.abs(distance) / (ship.radius / 2)));
  const dx = Math.cos(ship.angle) * distance / subdivisions;
  const dy = Math.sin(ship.angle) * distance / subdivisions;
  const free = (point: Vec2) =>
    !config.islands.some((island) => circleIntersectsRect(point, ship.radius, island));
  for (let index = 0; index < subdivisions; index += 1) {
    const x = clamp(ship.x + dx, ship.radius, config.arena.width - ship.radius);
    if (free({ x, y: ship.y })) ship.x = x;
    const y = clamp(ship.y + dy, ship.radius, config.arena.height - ship.radius);
    if (free({ x: ship.x, y })) ship.y = y;
  }
}

export function turnToward(ship: Ship, target: Vec2, dt: number) {
  const desired = Math.atan2(target.y - ship.y, target.x - ship.x);
  const error = Math.atan2(Math.sin(desired - ship.angle), Math.cos(desired - ship.angle));
  const turn = clamp(error, -ship.turnSpeed * dt, ship.turnSpeed * dt);
  ship.angle += turn;
  return error - turn;
}