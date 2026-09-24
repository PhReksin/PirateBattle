import type { Ship, WeaponSlot } from './types';

export type DamageCause = 'player-weapon' | 'enemy-weapon' | 'ram';
type Position = { x: number; y: number; at: number };
export type GameEvent = Position & (
    | { type: 'muzzle' | 'explosion' }
    | { type: 'shot'; kind: Ship['kind']; slot: WeaponSlot }
    | { type: 'damage'; cause: DamageCause }
    | { type: 'impact'; surface: 'ship' | 'island' }
);

export function createEventQueue() {
    const pending: GameEvent[] = [];
    return {
        push(event: GameEvent) { pending.push(event); },
        drain(): GameEvent[] { return pending.splice(0); },
        clear() { pending.length = 0; },
    };
}