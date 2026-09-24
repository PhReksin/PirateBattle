import type { EnemyKind, GameConfig } from './config';
import type { Enemy, Vec2, World } from './types';
import type { GameEvent } from './events';
import { circleIntersectsRect, expandedRect, segmentRect } from './geometry';
import { moveShip, turnToward } from './movement';
import { findPath } from './aiNavigation.ts';
import { tryFire } from './weapons';

export interface NavigationState {
    path: Vec2[];
    plannedAt: number;
    target: Vec2;
}

const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export function createEnemy(
    kind: EnemyKind,
    position: Vec2,
    id: string,
    config: GameConfig,
    player: Vec2,
): Enemy {
    const stats = config[kind];
    return {
        id,
        kind,
        x: position.x,
        y: position.y,
        angle: Math.atan2(player.y - position.y, player.x - position.x),
        radius: stats.radius,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        speed: stats.speed,
        turnSpeed: stats.turnSpeed,
        alive: true,
        cooldowns: { front: 0, left: 0, right: 0 },
    };
}

function safeSpawn(world: World, point: Vec2, radius: number): boolean {
    const { config, player } = world;
    const clearance = config.spawn.clearance;

    if (point.x < radius || point.y < radius ||
        point.x > config.arena.width - radius ||
        point.y > config.arena.height - radius) return false;

    if (config.islands.some((island) =>
        circleIntersectsRect(point, radius + clearance, island),
    )) return false;

    if (distance(point, player) < Math.max(
        config.spawn.minPlayerDistance,
        radius + player.radius + clearance,
    )) return false;

    return world.enemies.every((enemy) =>
        !enemy.alive || distance(point, enemy) >= radius + enemy.radius + clearance,
    );
}

export function findSpawn(
    world: World,
    kind: EnemyKind,
    random: () => number,
): Vec2 | null {
    const { config } = world;
    const radius = config[kind].radius;
    const inset = radius + config.spawn.clearance;
    const width = config.arena.width - inset * 2;
    const height = config.arena.height - inset * 2;
    if (width <= 0 || height <= 0) return null;

    const perimeter = (width + height) * 2;

    // Walk clockwise around a rectangle inside the arena boundary.
    function pointAt(offset: number): Vec2 {
        let remaining = offset % perimeter;
        if (remaining < width) return { x: inset + remaining, y: inset };
        remaining -= width;
        if (remaining < height) return { x: inset + width, y: inset + remaining };
        remaining -= height;
        if (remaining < width) return { x: inset + width - remaining, y: inset + height };
        remaining -= width;
        return { x: inset, y: inset + height - remaining };
    }

    for (let attempt = 0; attempt < config.spawn.attempts; attempt += 1) {
        const point = pointAt(random() * perimeter);
        if (safeSpawn(world, point, radius)) return point;
    }

    // A finite fallback scan; spacing derives from ship size and clearance.
    const spacing = Math.max(1, radius * 2 + config.spawn.clearance);
    const candidates = Math.max(4, Math.ceil(perimeter / spacing));
    for (let index = 0; index < candidates; index += 1) {
        const point = pointAt(index * perimeter / candidates);
        if (safeSpawn(world, point, radius)) return point;
    }

    return null;
}

export function spawnEnemies(
    world: World,
    random: () => number,
    nextId: () => string,
): void {
    if (world.phase !== 'running' || !world.player.alive) return;
    const { intervalSeconds, sequence } = world.config.spawn;
    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0 || sequence.length === 0) {
        throw new Error('Enemy spawning requires a positive interval and a nonempty sequence.');
    }

    while (world.activeSeconds + 1e-9 >= world.nextSpawnAt) {
        world.nextSpawnAt += intervalSeconds;
        const kind = sequence[world.spawnIndex % sequence.length]!;
        const position = findSpawn(world, kind, random);
        if (!position) continue;

        world.enemies.push(createEnemy(kind, position, nextId(), world.config, world.player));
        world.spawnIndex += 1;
    }
}

function hasClearShot(world: World, enemy: Enemy): boolean {
    const radius = world.config.shooter.weapon.projectileRadius;
    return world.config.islands.every((island) =>
        segmentRect(enemy, world.player, expandedRect(island, radius)) === null,
    );
}

export function steerEnemies(
    world: World,
    dt: number,
    navigation: Map<string, NavigationState>,
): void {
    if (world.phase !== 'running' || !world.player.alive || dt <= 0) return;

    const liveIds = new Set(world.enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.id));
    for (const id of navigation.keys()) {
        if (!liveIds.has(id)) navigation.delete(id);
    }

    const { config, player } = world;
    const rules = config.navigation;

    for (const enemy of world.enemies) {
        if (!enemy.alive) continue;

        const canStop = enemy.kind === 'shooter' &&
            distance(enemy, player) <= config.shooter.stopDistance &&
            hasClearShot(world, enemy);

        if (canStop) {
            turnToward(enemy, player, dt);
            navigation.delete(enemy.id);
            continue;
        }

        let state = navigation.get(enemy.id);
        if (!state || world.activeSeconds - state.plannedAt >= rules.replanSeconds ||
            distance(player, state.target) >= rules.replanDistance) {
            state = {
                path: findPath(enemy, player, config.islands, enemy.radius, rules.clearance, config.arena),
                plannedAt: world.activeSeconds,
                target: { x: player.x, y: player.y },
            };
            navigation.set(enemy.id, state);
        }

        // Use only a numerical tolerance: do not skip corners while still far away.
        while (state.path[0] && distance(enemy, state.path[0]) <= 1e-6) {
            state.path.shift();
        }
        const waypoint = state.path[0];
        if (!waypoint) continue;

        const error = turnToward(enemy, waypoint, dt);
        if (Math.abs(error) <= rules.moveAngleTolerance) {
            moveShip(enemy, Math.min(enemy.speed * dt, distance(enemy, waypoint)), config);
        }
    }
}

export function fireShooters(
    world: World,
    nextId: () => string,
    emit: (event: GameEvent) => void,
): void {
    if (world.phase !== 'running' || !world.player.alive) return;
    const { attackRange, aimTolerance } = world.config.shooter;

    for (const enemy of world.enemies) {
        if (!enemy.alive || enemy.kind !== 'shooter') continue;
        if (distance(enemy, world.player) > attackRange || !hasClearShot(world, enemy)) continue;

        const desired = Math.atan2(world.player.y - enemy.y, world.player.x - enemy.x);
        const error = Math.atan2(Math.sin(desired - enemy.angle), Math.cos(desired - enemy.angle));
        if (Math.abs(error) > aimTolerance) continue;

        // tryFire checks the cooldown, creates the shot, and emits the muzzle event.
        tryFire(world, enemy, 'front', nextId, emit);
    }
}