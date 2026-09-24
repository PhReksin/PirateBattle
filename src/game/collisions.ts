import type { EndReason, Ship, World } from './types';
import type { DamageCause, GameEvent } from './events';
import { expandedRect, segmentCircle, segmentRect } from './geometry';

type Emit = (event: GameEvent) => void;
type Finish = (reason: EndReason) => void;

export function damageShip(
    world: World, target: Ship, damage: number,
    cause: DamageCause, emit: Emit, finish: Finish,
) {
    if (world.phase !== 'running' || !target.alive) return;
    target.hp = Math.max(0, target.hp - damage);
    emit({ type: 'damage', cause, x: target.x, y: target.y, at: world.activeSeconds });
    if (target.hp > 0) return;
    target.alive = false;
    emit({ type: 'explosion', x: target.x, y: target.y, at: world.activeSeconds });
    if (target.kind === 'player') finish('death');
    else if (cause === 'player-weapon') world.score += 1;
}

export function advanceProjectiles(world: World, dt: number, emit: Emit, finish: Finish) {
    for (const shot of world.projectiles) {
        if (world.phase !== 'running') break;
        if (!shot.alive) continue;
        const lifetimeLeft = Math.max(0, shot.lifetime - shot.age);
        const rangeLeft = Math.max(0, shot.range - shot.distance);
        const dx = shot.direction.x, dy = shot.direction.y;
        const toBoundaryX = dx > 0 ? (world.config.arena.width - shot.x) / dx
            : dx < 0 ? -shot.x / dx : Infinity;
        const toBoundaryY = dy > 0 ? (world.config.arena.height - shot.y) / dy
            : dy < 0 ? -shot.y / dy : Infinity;
        const boundary = Math.max(0, Math.min(toBoundaryX, toBoundaryY));
        const travel = Math.min(shot.speed * Math.min(dt, lifetimeLeft), rangeLeft, boundary);
        const to = { x: shot.x + dx * travel, y: shot.y + dy * travel };
        let hitTime = Infinity;
        let target: Ship | undefined;
        for (const island of world.config.islands) {
            const time = segmentRect(shot, to, expandedRect(island, shot.radius));
            if (time !== null && time < hitTime) hitTime = time;
        }
        const candidates: Ship[] = shot.faction === 'player' ? [...world.enemies] : [world.player];
        candidates.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
        for (const ship of candidates) {
            if (!ship.alive) continue;
            const time = segmentCircle(shot, to, ship, ship.radius + shot.radius);
            if (time !== null && time < hitTime) { hitTime = time; target = ship; }
        }
        const fraction = Number.isFinite(hitTime) ? hitTime : 1;
        shot.x += dx * travel * fraction;
        shot.y += dy * travel * fraction;
        shot.distance += travel * fraction;
        shot.age += Math.min(dt, lifetimeLeft);
        if (Number.isFinite(hitTime)) {
            shot.alive = false;
            emit({ type: 'impact', surface: target ? 'ship' : 'island', x: shot.x, y: shot.y, at: world.activeSeconds });
            if (target) damageShip(world, target, shot.damage,
                shot.faction === 'player' ? 'player-weapon' : 'enemy-weapon', emit, finish);
        } else if (shot.age >= shot.lifetime - 1e-9 ||
            shot.distance >= shot.range - 1e-9 || travel >= boundary - 1e-9) {
            shot.alive = false;
        }
    }
}

export function resolveChaserContacts(world: World, emit: Emit, finish: Finish) {
    for (const enemy of world.enemies) {
        if (world.phase !== 'running') break;
        if (!enemy.alive || enemy.kind !== 'chaser') continue;
        const distance = Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y);
        if (distance > enemy.radius + world.player.radius) continue;
        enemy.alive = false;
        enemy.hp = 0;
        emit({ type: 'explosion', x: enemy.x, y: enemy.y, at: world.activeSeconds });
        damageShip(world, world.player, world.config.chaser.contactDamage, 'ram', emit, finish);
    }
}