import { circleIntersectsRect } from '../game/geometry';
import { DEFAULT_CONFIG } from '../game/config';
import type { GameConfig } from '../game/config';
import type { MatchRecord } from './contracts';

function sameShape(value: unknown, template: unknown): boolean {
    if (typeof template === 'number') return typeof value === 'number' && Number.isFinite(value);
    if (typeof template === 'string') return typeof value === 'string' && value.length > 0;
    if (Array.isArray(template)) {
        return Array.isArray(value) && value.length > 0 &&
            value.every((entry) => sameShape(entry, template[0]));
    }
    if (template && typeof template === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const object = value as Record<string, unknown>;
        return Object.entries(template).every(([key, item]) => sameShape(object[key], item));
    }
    return value === template;
}

export function isGameConfig(value: unknown): value is GameConfig {
    if (!sameShape(value, DEFAULT_CONFIG)) return false;
    const config = value as GameConfig;
    const weapons = [config.player.front, config.player.broadside, config.shooter.weapon];
    const ships = [config.player, config.chaser, config.shooter];
    return Number.isInteger(config.sessionSeconds) &&
        config.sessionSeconds >= 60 && config.sessionSeconds <= 180 &&
        config.spawn.intervalSeconds >= 1 && config.spawn.intervalSeconds <= 10 &&
        Number.isInteger(config.spawn.intervalSeconds * 2) &&
        config.spawn.sequence.every((kind) => kind === 'chaser' || kind === 'shooter') &&
        Number.isInteger(config.spawn.attempts) && config.spawn.attempts > 0 &&
        Number.isInteger(config.randomSeed) && config.randomSeed >= 0 && config.randomSeed <= 4294967295 &&
        config.spawn.clearance >= 0 && config.spawn.minPlayerDistance > 0 &&
        config.player.broadsideSpacing > 0 && config.player.broadsideOuterAngle >= 0 &&
        config.player.broadsideOuterAngle < 90 && config.chaser.contactDamage > 0 &&
        config.shooter.attackRange > 0 && config.shooter.stopDistance > 0 &&
        config.shooter.aimTolerance > 0 && config.shooter.aimTolerance <= Math.PI &&
        Object.values(config.navigation).every((number) => number > 0) &&
        config.player.start.x >= config.player.radius && config.player.start.y >= config.player.radius &&
        config.player.start.x <= config.arena.width - config.player.radius &&
        config.player.start.y <= config.arena.height - config.player.radius &&
        config.islands.every((island) => island.x >= 0 && island.y >= 0 &&
            island.x + island.width <= config.arena.width && island.y + island.height <= config.arena.height &&
            !circleIntersectsRect(config.player.start, config.player.radius, island)) &&
        config.arena.width > 0 && config.arena.height > 0 &&
        config.islands.every((island) => island.width > 0 && island.height > 0) &&
        ships.every((ship) => ship.maxHp > 0 && ship.radius > 0 && ship.speed > 0 && ship.turnSpeed > 0) &&
        weapons.every((weapon) => Object.values(weapon).every((number) => number > 0));
}

export function isMatchRecord(value: unknown): value is MatchRecord {
    if (!value || typeof value !== 'object') return false;
    const match = value as Record<string, unknown>;
    if (!isGameConfig(match.config)) return false;
    return typeof match.matchId === 'string' && match.matchId.length > 0 &&
        typeof match.playerId === 'string' && match.playerId.length > 0 &&
        typeof match.playerName === 'string' && match.playerName.length > 0 &&
        typeof match.finishedAt === 'string' && Number.isFinite(Date.parse(match.finishedAt)) &&
        typeof match.configKey === 'string' && /^[a-f0-9]{64}$/.test(match.configKey) &&
        typeof match.score === 'number' && Number.isInteger(match.score) && match.score >= 0 &&
        typeof match.activeDurationSeconds === 'number' && Number.isFinite(match.activeDurationSeconds) &&
        match.activeDurationSeconds >= 0 &&
        match.activeDurationSeconds <= match.config.sessionSeconds + 1e-6 &&
        (match.reason === 'time' || match.reason === 'death') &&
        (match.reason !== 'time' ||
            Math.abs(match.activeDurationSeconds - match.config.sessionSeconds) < 1e-6);
}