import type { World } from '../game/types';
export interface ResourceCounters {
    canvases: number; tickerCallbacks: number; listeners: number; shipViews: number;
    projectileViews: number; effects: number; simulationReferences: number;
}
export interface GameTestBridge {
    ready: boolean; advance(milliseconds: number): void;
    snapshot(): Readonly<World>; resources(): Readonly<ResourceCounters>;
}
export function installTestBridge(world: World, advance: (seconds: number) => void,
    render: () => void, resources: () => ResourceCounters) {
    if (import.meta.env.VITE_TEST_MODE !== 'true') return () => { };
    const bridge: GameTestBridge = {
        ready: true,
        advance(milliseconds) { advance(milliseconds / 1000); render(); },
        snapshot: () => structuredClone(world), resources: () => ({ ...resources() }),
    };
    window.__gameTest = bridge;
    return () => { if (window.__gameTest === bridge) delete window.__gameTest; };
}