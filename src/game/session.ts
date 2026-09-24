import { readTestSetup } from '../testing/scenarios';
import type { TestSetup } from '../testing/scenarios';
import { createConfigSnapshot } from './config';
import type { GameConfig } from './config';
import { loadOptions } from '../data/options';
import { loadIdentity } from '../data/identity';
import type { PlayerIdentity } from '../data/identity';

export interface GameSession {
    matchId: string;
    testSetup?: TestSetup;
    player: PlayerIdentity;
    config: GameConfig;
}

export function createSession(): GameSession {
    return {
        matchId: crypto.randomUUID(),
        testSetup: readTestSetup(location.search),
        player: loadIdentity(),
        config: createConfigSnapshot(loadOptions()),
    };
}