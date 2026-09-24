import { createRandom } from '../game/random';
import type { PlayerIdentity } from '../data/identity';
import type { GameConfig } from '../game/config';
import type { MatchRecord } from '../data/contracts';
import { configurationKey } from '../data/configKey';

export async function createFixtures(player: PlayerIdentity, config: GameConfig, seed = 1337): Promise<MatchRecord[]> {
    const random = createRandom(seed);
    const other = structuredClone(config);
    other.sessionSeconds = config.sessionSeconds === 120 ? 90 : 120;
    const keys = await Promise.all([configurationKey(config), configurationKey(other)]);
    return Array.from({ length: 31 }, (_, index) => {
        const variant = index >= 27 ? 1 : 0;
        const snapshot = variant ? other : config;
        return {
            matchId: 'fixture-' + String(index + 1).padStart(3, '0'),
            playerId: index < 12 ? player.id : 'fixture-player-' + index,
            playerName: index < 12 ? player.displayName : 'Fixture Captain ' + index,
            finishedAt: new Date(Date.UTC(2026, 0, 1, 12, Math.floor(index / 2))).toISOString(),
            score: Math.floor(random() * 8), activeDurationSeconds: snapshot.sessionSeconds,
            reason: 'time', config: snapshot, configKey: keys[variant],
        };
    });
}