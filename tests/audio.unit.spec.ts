import { test, expect } from '@playwright/test';
import { createAudioEngine } from '../src/audio/audioEngine';
import { soundForEvent } from '../src/audio/audio';
import { SOUNDS } from '../src/audio/sounds';
import { createSimulation } from '../src/game/createSimulation';
import { DEFAULT_CONFIG } from '../src/game/config';
import { createEventQueue } from '../src/game/events';
import { tryFire } from '../src/game/weapons';
import { damageShip, advanceProjectiles, resolveChaserContacts } from '../src/game/collisions';

test('accepted volleys emit one sound; cooldown and pause emit none', () => {
    const sim = createSimulation(DEFAULT_CONFIG, [], () => {});
    const events = createEventQueue();
    let id = 0;
    const fire = (slot: 'front' | 'left') => tryFire(sim.world, sim.world.player, slot, () => String(id++), events.push);
    fire('left');
    const broadside = events.drain();
    expect(sim.world.projectiles).toHaveLength(3);
    expect(broadside.filter(event => event.type === 'muzzle')).toHaveLength(3);
    expect(broadside.map(soundForEvent).filter(Boolean)).toEqual(['playerBroadside']);
    fire('left'); expect(events.drain()).toEqual([]);
    fire('front'); expect(events.drain().map(soundForEvent).filter(Boolean)).toEqual(['playerShot']);
    sim.pause(); sim.world.player.cooldowns.front = 0;
    fire('front'); expect(events.drain()).toEqual([]);
});

test('enemy shot, wood hit, ram and destruction select distinct cues', () => {
    const sim = createSimulation(DEFAULT_CONFIG, [], () => {});
    const events = createEventQueue();
    const enemy = { ...sim.world.player, id: 'enemy', kind: 'shooter' as const, hp: 20 };
    tryFire(sim.world, enemy, 'front', () => 'shot', events.push);
    expect(events.drain().map(soundForEvent).filter(Boolean)).toEqual(['enemyShot']);
    damageShip(sim.world, enemy, 20, 'player-weapon', events.push, sim.finish);
    expect(events.drain().map(soundForEvent).filter(Boolean)).toEqual(['woodHit', 'destroyed']);
    damageShip(sim.world, enemy, 20, 'player-weapon', events.push, sim.finish);
    expect(events.drain()).toEqual([]); expect(sim.world.score).toBe(1);
    sim.world.enemies.push({ ...sim.world.player, id: 'rammer', kind: 'chaser' });
    resolveChaserContacts(sim.world, events.push, sim.finish);
    expect(events.drain().map(soundForEvent).filter(Boolean)).toEqual(['destroyed', 'collision']);
});

test('a ship impact has one damage sound; island impact has a splash', () => {
    const sim = createSimulation(DEFAULT_CONFIG, [], () => {});
    const events = createEventQueue();
    sim.world.enemies.push({ ...sim.world.player, id: 'target', kind: 'shooter', x: 240, hp: 100 });
    tryFire(sim.world, sim.world.player, 'front', () => 'shot', events.push);
    events.clear(); advanceProjectiles(sim.world, 0.5, events.push, sim.finish);
    expect(events.drain().map(soundForEvent).filter(Boolean)).toEqual(['woodHit']);
    expect(soundForEvent({ type: 'impact', surface: 'island', x: 0, y: 0, at: 0 })).toBe('splash');
});

class FakeGain {
    gain = { value: 1, setTargetAtTime: (value: number) => { this.gain.value = value; } };
    connect() {} disconnect() {}
}
class FakeSource {
    buffer: AudioBuffer | null = null;
    loop = false;
    onended: (() => void) | null = null;
    started = false;
    stopped = false;
    connect() {} disconnect() {}
    start() { this.started = true; }
    stop() { this.stopped = true; }
}
class FakeContext {
    static instances: FakeContext[] = [];
    state = 'suspended';
    currentTime = 0;
    destination = {};
    sources: FakeSource[] = [];
    constructor() { FakeContext.instances.push(this); }
    createGain() { return new FakeGain(); }
    createBufferSource() { const source = new FakeSource(); this.sources.push(source); return source; }
    async decodeAudioData() { return { duration: 1 } as AudioBuffer; }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
}
const settle = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const originalFetch = globalThis.fetch;
const originalContext = globalThis.AudioContext;
let engine: ReturnType<typeof createAudioEngine>;

test.beforeEach(() => {
    FakeContext.instances = [];
    globalThis.AudioContext = FakeContext as unknown as typeof AudioContext;
    globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]));
    engine = createAudioEngine({ muted: false, volume: 0.7 });
});
test.afterEach(() => {
    engine.destroy();
    globalThis.fetch = originalFetch;
    globalThis.AudioContext = originalContext;
});

test('no autoplay; repeated unlock creates one loop; mute/unmute never duplicates it', async () => {
    engine.preload(); await settle();
    expect(FakeContext.instances).toHaveLength(0);
    engine.unlock(); engine.unlock(); await settle();
    const context = FakeContext.instances[0];
    const liveLoops = () => context.sources.filter(source => source.loop && source.started && !source.stopped);
    expect(FakeContext.instances).toHaveLength(1); expect(liveLoops()).toHaveLength(1);
    engine.setSettings({ muted: true, volume: 0.7 }); expect(liveLoops()).toHaveLength(0);
    engine.play('playerShot');
    expect(context.sources.filter(source => !source.loop)).toHaveLength(0);
    engine.setSettings({ muted: false, volume: 0.7 }); await settle();
    expect(liveLoops()).toHaveLength(1);
    engine.setAudible(false); expect(liveLoops()).toHaveLength(0); expect(context.state).toBe('suspended');
    engine.setAudible(true); await settle(); expect(liveLoops()).toHaveLength(1);
    engine.destroy(); expect(liveLoops()).toHaveLength(0); expect(context.state).toBe('closed');
});

test('pause cancels only its combat voices and rejects a delayed shot', async () => {
    let release: (() => void) | undefined;
    const loaded = new Promise<void>(resolve => { release = resolve; });
    globalThis.fetch = async () => { await loaded; return new Response(new Uint8Array([1])); };
    engine.unlock();
    const scope = { active: true };
    engine.play('playerShot', scope); engine.stopScope(scope);
    release!(); await settle();
    const context = FakeContext.instances[0];
    expect(context.sources.filter(source => !source.loop)).toHaveLength(0);
    const active = { active: true };
    engine.play('enemyShot', active); engine.play('click');
    expect(context.sources.filter(source => !source.loop && !source.stopped)).toHaveLength(2);
    engine.stopScope(active);
    expect(context.sources.filter(source => !source.loop && !source.stopped)).toHaveLength(1);
    expect(context.sources.filter(source => source.loop && !source.stopped)).toHaveLength(1);
});

test('failed sounds stay optional and destruction during loading leaves no voices', async () => {
    globalThis.fetch = async () => { throw new Error('Offline'); };
    engine.preload(); engine.unlock(); engine.play('destroyed'); await settle();
    expect(FakeContext.instances[0].sources).toHaveLength(0);
    engine.destroy();
    engine = createAudioEngine({ muted: false, volume: 0.7 });
    let release: (() => void) | undefined;
    const loaded = new Promise<void>(resolve => { release = resolve; });
    globalThis.fetch = async () => { await loaded; return new Response(new Uint8Array([1])); };
    engine.unlock(); engine.play('playerBroadside'); engine.destroy(); release!(); await settle();
    expect(FakeContext.instances[1].sources).toHaveLength(0);
    expect(FakeContext.instances[1].state).toBe('closed');
});

test('burst traffic is capped and repeated cues are throttled', async () => {
    engine.unlock(); await settle();
    const context = FakeContext.instances[0];
    engine.play('woodHit'); engine.play('woodHit');
    expect(context.sources.filter(source => !source.loop)).toHaveLength(1);
    const names = (Object.keys(SOUNDS) as Array<keyof typeof SOUNDS>).filter(name => name !== 'ocean');
    for (let round = 0; round < 4; round++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        for (const name of names) engine.play(name);
    }
    expect(context.sources.filter(source => !source.loop && !source.stopped)).toHaveLength(20);
});
