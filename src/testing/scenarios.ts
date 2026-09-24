import type { World } from '../game/types';
import { createEnemy } from '../game/enemies';
const names = ['normal', 'clear-water', 'front-enemy', 'broadsides', 'island', 'boundary',
    'chaser', 'blocked-chaser', 'shooter', 'blocked-shooter', 'ram', 'death', 'asset-failure', 'visual-damage'] as const;
export interface TestSetup { scene: typeof names[number]; assetFailOnce: boolean; finishedAt: string }
export function readTestSetup(search: string): TestSetup | undefined {
    if (import.meta.env.VITE_TEST_MODE !== 'true') return undefined;
    const value = new URLSearchParams(search).get('testScenario') ?? 'normal';
    if (!names.some((name) => name === value)) throw new Error('Unknown test scenario: ' + value);
    return { scene: value as TestSetup['scene'], assetFailOnce: value === 'asset-failure', finishedAt: '2026-09-22T12:00:00.000Z' };
}
export function prepareTestScene(world: World, setup: TestSetup | undefined, nextId: () => string) {
    if (!setup || setup.scene === 'normal') return;
    world.nextSpawnAt = world.config.sessionSeconds + 1;
    const player = world.player;
    player.x = 150; player.y = 100; player.angle = 0;
    function enemy(kind: 'chaser' | 'shooter', x: number, y: number) {
        const ship = createEnemy(kind, { x, y }, nextId(), world.config, player);
        world.enemies.push(ship); return ship;
    }
    switch (setup.scene) {
        case 'visual-damage': {
            player.x = 330; player.y = 270; player.hp = 50;
            enemy('shooter', 275, 200).hp = 12;
            enemy('chaser', 230, 330).hp = 40;
            enemy('chaser', 440, 390).hp = 20;
            break;
        }
        case 'front-enemy': enemy('chaser', 270, 100); break;
        case 'broadsides': player.y = 270; enemy('shooter', 150, 170); enemy('shooter', 150, 370); break;
        case 'island': player.x = 350; player.y = 270; break;
        case 'boundary': player.x = 930; break;
        case 'chaser': enemy('chaser', 300, 100); break;
        case 'blocked-chaser': player.x = 650; player.y = 270; enemy('chaser', 300, 270); break;
        case 'shooter': enemy('shooter', 350, 100); break;
        case 'blocked-shooter': player.x = 600; player.y = 270; enemy('shooter', 360, 270); break;
        case 'ram': enemy('chaser', player.x + 43, player.y); break;
        case 'death':
            enemy('chaser', player.x + 43, player.y); enemy('chaser', player.x - 43, player.y);
            enemy('chaser', player.x, player.y + 43); enemy('chaser', player.x, player.y - 43); break;
    }
}