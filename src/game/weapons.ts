import type { Ship, WeaponSlot, World } from './types';
import type { GameEvent } from './events';
import { expandedRect, segmentRect } from './geometry';

export function tryFire(
    world: World, ship: Ship, slot: WeaponSlot,
    nextId: () => string, emit: (event: GameEvent) => void,
) {
    if (world.phase !== 'running' || !ship.alive || ship.cooldowns[slot] > 1e-9) return;
    if (ship.kind === 'chaser' || (ship.kind === 'shooter' && slot !== 'front')) return;
    const player = ship.kind === 'player';
    const weapon = player
        ? (slot === 'front' ? world.config.player.front : world.config.player.broadside)
        : world.config.shooter.weapon;
    ship.cooldowns[slot] = weapon.cooldownSeconds;
    emit({ type: 'shot', kind: ship.kind, slot, x: ship.x, y: ship.y, at: world.activeSeconds });
    const forward = { x: Math.cos(ship.angle), y: Math.sin(ship.angle) };
    const side = slot === 'left' ? -1 : 1;
    const direction = slot === 'front' ? forward
        : { x: -forward.y * side, y: forward.x * side };
    const spacing = world.config.player.broadsideSpacing;
    const outerAngle = world.config.player.broadsideOuterAngle;
    const offsets = slot === 'front' ? [0] : [-spacing, 0, spacing];
    const muzzleDistance = ship.radius + weapon.projectileRadius + 1;
    const spreadRadians = (outerAngle * Math.PI) / 180;

    for (const offset of offsets) {
        const spread = slot === 'front'
            ? 0
            : Math.sign(offset) * spreadRadians;

        const shotDirection = {
            x: direction.x * Math.cos(spread) + forward.x * Math.sin(spread),
            y: direction.y * Math.cos(spread) + forward.y * Math.sin(spread),
        };

        const muzzle = {
            x: ship.x + direction.x * muzzleDistance + forward.x * offset,
            y: ship.y + direction.y * muzzleDistance + forward.y * offset,
        };
        emit({ type: 'muzzle', ...muzzle, at: world.activeSeconds });
        const blocked = world.config.islands.some((island) =>
            segmentRect(ship, muzzle, expandedRect(island, weapon.projectileRadius)) !== null,
        );
        if (blocked) continue;
        world.projectiles.push({
            id: nextId(), ownerId: ship.id, faction: player ? 'player' : 'enemy',
            ...muzzle, direction: shotDirection, speed: weapon.projectileSpeed,
            radius: weapon.projectileRadius, damage: weapon.damage,
            age: 0, lifetime: weapon.lifetimeSeconds,
            distance: 0, range: weapon.range, alive: true,
        });
        if (player && slot === 'front') world.telemetry.playerFrontProjectilesCreated += 1;
    }
}