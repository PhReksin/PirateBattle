import type { Ship } from '../game/types';

// Presentation only: these values never change physics or consume the gameplay RNG.
export function damageStage(hp: number, maxHp: number): 0 | 1 | 2 {
  const fraction = maxHp > 0 ? hp / maxHp : 0;
  return fraction <= 0.3 ? 2 : fraction <= 0.65 ? 1 : 0;
}

export function followCamera(
  width: number, height: number,
  arena: { width: number; height: number },
  player: Pick<Ship, 'x' | 'y' | 'angle'>,
) {
  const fit = Math.min(width / arena.width, height / arena.height);
  const scale = Math.max(fit * 1.75, Math.min(width, height) / 300);
  // Keep the ship between the HUD and controls, with a little room ahead.
  const lookAhead = 32;
  return { scale,
    x: width / 2 - (player.x + Math.cos(player.angle) * lookAhead) * scale,
    y: height * 0.48 - (player.y + Math.sin(player.angle) * lookAhead) * scale,
  };
}

// Adjacent cells in the supplied 16-column tile sheet; do not repeat an edge tile.
export const ISLAND_TILE_GRID = [
  [6, 7, 8, 9],
  [22, 23, 24, 25],
  [38, 39, 40, 41],
  [54, 55, 56, 57],
] as const;