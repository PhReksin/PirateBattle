export type EnemyKind = 'chaser' | 'shooter';

export interface WeaponConfig {
  damage: number;
  projectileSpeed: number;
  projectileRadius: number;
  range: number;
  lifetimeSeconds: number;
  cooldownSeconds: number;
}

export interface ShipConfig {
  maxHp: number;
  radius: number;
  speed: number;
  turnSpeed: number;
}

export interface GameConfig {
  rulesVersion: string;
  randomSeed: number;
  arena: { width: number; height: number };
  islands: Array<{ x: number; y: number; width: number; height: number }>;
  sessionSeconds: number;
  spawn: {
    intervalSeconds: number;
    sequence: EnemyKind[];
    minPlayerDistance: number;
    clearance: number;
    attempts: number;
  };
  player: ShipConfig & {
    start: { x: number; y: number; angle: number };
    front: WeaponConfig;
    broadside: WeaponConfig;
    broadsideSpacing: number;
    broadsideOuterAngle: number;
  };
  chaser: ShipConfig & { contactDamage: number };
  shooter: ShipConfig & {
    attackRange: number;
    stopDistance: number;
    aimTolerance: number;
    weapon: WeaponConfig;
  };
  navigation: {
    clearance: number;
    moveAngleTolerance: number;
    replanSeconds: number;
    replanDistance: number;
  };
}

//starting point values
export const DEFAULT_CONFIG: GameConfig = {
  rulesVersion: 'island-survival-v1',
  randomSeed: 1337,
  arena: { width: 960, height: 540 },
  islands: [{ x: 400, y: 200, width: 160, height: 140 }],
  sessionSeconds: 120,
  spawn: {
    intervalSeconds: 3,
    sequence: ['chaser', 'shooter'],
    minPlayerDistance: 280,
    clearance: 12,
    attempts: 40,
  },
  player: {
    maxHp: 100, radius: 25, speed: 80, turnSpeed: 1.6,
    start: { x: 150, y: 270, angle: 0 },
    front: {
      damage: 25, projectileSpeed: 200, projectileRadius: 6,
      range: 500, lifetimeSeconds: 1.2, cooldownSeconds: 0.6,
    },
    broadside: {
      damage: 20, projectileSpeed: 200, projectileRadius: 6,
      range: 400, lifetimeSeconds: 1.2, cooldownSeconds: 2.0,
    },
    broadsideSpacing: 15, broadsideOuterAngle: 0,
  },
  chaser: {
    maxHp: 40, radius: 17, speed: 55, turnSpeed: 2,
    contactDamage: 25,
  },
  shooter: {
    maxHp: 60, radius: 22, speed: 45, turnSpeed: 1.8,
    attackRange: 120, stopDistance: 60, aimTolerance: 0.3,
    weapon: {
      damage: 10, projectileSpeed: 100, projectileRadius: 4,
      range: 340, lifetimeSeconds: 1.6, cooldownSeconds: 1.4,
    },
  },
  navigation: {
    clearance: 4, moveAngleTolerance: 0.6,
    replanSeconds: 0.25, replanDistance: 24,
  },
};

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function createConfigSnapshot(options: {
  sessionSeconds: number;
  spawnSeconds: number;
}): GameConfig {
  const config = structuredClone(DEFAULT_CONFIG);
  config.sessionSeconds = options.sessionSeconds;
  config.spawn.intervalSeconds = options.spawnSeconds;
  return deepFreeze(config);
}