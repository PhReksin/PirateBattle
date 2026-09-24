import type { GameConfig } from './config';
import type { EndReason, GameResult, Ship, World } from './types';

export type System = (
  world: World, dt: number, finish: (reason: EndReason) => void
) => void;

export function createSimulation(
  config: GameConfig,
  systems: readonly System[],
  onComplete: (result: GameResult) => void,
) {
  const player: Ship = {
    id: 'player', kind: 'player', ...config.player.start,
    radius: config.player.radius,
    hp: config.player.maxHp, maxHp: config.player.maxHp,
    speed: config.player.speed, turnSpeed: config.player.turnSpeed,
    alive: true, cooldowns: { front: 0, left: 0, right: 0 },
  };
  const world: World = {
    config, player, phase: 'running',
    enemies: [], projectiles: [], activeSeconds: 0, score: 0,
    nextSpawnAt: config.spawn.intervalSeconds,
    spawnIndex: 0, result: null,
    telemetry: { playerFrontProjectilesCreated: 0 },
  };

  function finish(reason: EndReason) {
    if (world.phase !== 'running') return;
    world.phase = 'ended';
    world.result = {
      score: world.score, activeDurationSeconds: world.activeSeconds,
      reason, config: world.config,
    };
    onComplete(world.result);
  }

  return {
    world,
    finish,
    step(requestedDt: number) {
      if (world.phase !== 'running') return;
      const remaining = config.sessionSeconds - world.activeSeconds;
      if (remaining <= 1e-9) { finish('time'); return; }
      const dt = Math.min(requestedDt, remaining);
      world.activeSeconds += dt;
      for (const ship of [world.player, ...world.enemies]) {
        for (const slot of ['front', 'left', 'right'] as const) {
          ship.cooldowns[slot] = Math.max(0, ship.cooldowns[slot] - dt);
        }
      }
      for (const system of systems) {
        if (world.phase !== 'running') break;
        system(world, dt, finish);
      }
      if (world.phase !== 'running') return;
      world.enemies = world.enemies.filter((enemy) => enemy.alive);
      world.projectiles = world.projectiles.filter((shot) => shot.alive);
      if (world.player.hp <= 0) finish('death');
      else if (config.sessionSeconds - world.activeSeconds <= 1e-9) finish('time');
    },
    pause() { if (world.phase === 'running') world.phase = 'paused'; },
    resume() { if (world.phase === 'paused') world.phase = 'running'; },
    abandon() {
      if (world.phase === 'running' || world.phase === 'paused') world.phase = 'abandoned';
    },
  };
}