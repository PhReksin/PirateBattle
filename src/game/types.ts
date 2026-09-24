import type { EnemyKind, GameConfig } from './config';

export interface Vec2 { x: number; y: number }
export interface Rect extends Vec2 { width: number; height: number }
export type Phase = 'running' | 'paused' | 'ended' | 'abandoned';
export type WeaponSlot = 'front' | 'left' | 'right';
export type EndReason = 'time' | 'death';

export interface Ship extends Vec2 {
  id: string;
  kind: 'player' | EnemyKind;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  turnSpeed: number;
  alive: boolean;
  cooldowns: Record<WeaponSlot, number>;
}

export type Enemy = Ship & { kind: EnemyKind };

export interface Projectile extends Vec2 {
  id: string;
  ownerId: string;
  faction: 'player' | 'enemy';
  direction: Vec2;
  speed: number;
  radius: number;
  damage: number;
  age: number;
  lifetime: number;
  distance: number;
  range: number;
  alive: boolean;
}

export interface GameResult {
  score: number;
  activeDurationSeconds: number;
  reason: EndReason;
  config: GameConfig;
}

export interface World {
  config: GameConfig;
  phase: Phase;
  player: Ship;
  enemies: Enemy[];
  projectiles: Projectile[];
  activeSeconds: number;
  score: number;
  nextSpawnAt: number;
  spawnIndex: number;
  result: GameResult | null;
  telemetry: { playerFrontProjectilesCreated: number };
}