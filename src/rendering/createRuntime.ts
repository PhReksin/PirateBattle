import { createBattleAudio } from '../audio/audio';
import { installTestBridge } from '../testing/bridge';
import { prepareTestScene } from '../testing/scenarios';
import { createProfiler } from '../game/profiler';
import type { ProfileReport } from '../game/profiler';
import { Ticker } from 'pixi.js';
import type { GameSession } from '../game/session';
import type { GameResult } from '../game/types';
import type { HudSnapshot } from '../components/Hud';
import { createSimulation } from '../game/createSimulation';
import type { System } from '../game/createSimulation';
import { createClock } from '../game/clock';
import { createInput, bindKeyboard } from '../game/input';
import type { InputController } from '../game/input';
import { createEventQueue } from '../game/events';
import { createRandom } from '../game/random';
import { spawnEnemies, steerEnemies, fireShooters } from '../game/enemies';
import type { NavigationState } from '../game/enemies';
import { moveShip } from '../game/movement';
import { tryFire } from '../game/weapons';
import { advanceProjectiles, resolveChaserContacts } from '../game/collisions';
import { createRenderer } from './createRenderer';

export interface RuntimeOptions {
    host: HTMLElement;
    session: GameSession;
    onHud: (snapshot: HudSnapshot) => void;
    onComplete: (result: GameResult) => void;
    onProfileComplete?: (report: ProfileReport) => void;
}
export interface GameRuntime {
    readonly input: InputController;
    start(): void;
    pause(): void;
    resume(): void;
    destroy(): void;
}

export async function createRuntime(options: RuntimeOptions): Promise<GameRuntime> {
    const input = createInput();
    const battleAudio = createBattleAudio();
    const events = createEventQueue();
    const random = createRandom(options.session.config.randomSeed);
    const navigation = new Map<string, NavigationState>();
    const ownedListeners = new Set<EventListener>();
    const disposers: Array<() => void> = [];
    let id = 0;
    const nextId = () => 'entity-' + id++;
    let held = input.snapshot();
    let renderer: Awaited<ReturnType<typeof createRenderer>> | undefined;
    let simulation: ReturnType<typeof createSimulation> | undefined;
    let clock: ReturnType<typeof createClock> | undefined;
    let ticker: Ticker | undefined;
    let started = false;
    let destroyed = false;
    const profiler = import.meta.env.VITE_TEST_MODE !== 'true' && new URLSearchParams(location.search).get('profile') === '1' ? createProfiler() : undefined;
    let completedResult: GameResult | undefined;
    let previousHud = '';

    function resourceCounts() {
        const counts = renderer?.counts();
        return {
            canvases: options.host.querySelectorAll('canvas').length, tickerCallbacks: ticker?.count ?? 0,
            listeners: ownedListeners.size + (counts?.resizeListeners ?? 0), shipViews: counts?.shipViews ?? 0,
            projectileViews: counts?.projectileViews ?? 0, effects: counts?.effects ?? 0, simulationReferences: simulation ? 1 : 0
        };
    }
    function publishHud() {
        if (!simulation || destroyed) return;
        const { world } = simulation;
        const snapshot: HudSnapshot = {
            hp: world.player.hp, maxHp: world.player.maxHp, score: world.score,
            remainingSeconds: Math.ceil(Math.max(0, world.config.sessionSeconds - world.activeSeconds)),
            phase: world.phase,
        };
        const key = JSON.stringify(snapshot);
        if (key !== previousHud) { previousHud = key; options.onHud(snapshot); }
    }
    function renderFrame(activeFrame = false) {
        if (!simulation || !renderer || destroyed) return;
        const frameEvents = events.drain();
        renderer.render(simulation.world, frameEvents);
        battleAudio.consume(frameEvents);
        const world = simulation.world;
        profiler?.frame(performance.now(), activeFrame, world.activeSeconds, {
            enemies: world.enemies.filter((enemy) => enemy.alive).length,
            projectiles: world.projectiles.filter((shot) => shot.alive).length, effects: renderer.counts().effects,
        });
        publishHud();
        if (completedResult) {
            battleAudio.complete();
            const result = completedResult; completedResult = undefined;
            if (profiler) options.onProfileComplete?.({
                metrics: profiler.report(), config: world.config,
                activeDurationSeconds: result.activeDurationSeconds, reason: result.reason,
                fullDurationRun: result.reason === 'time' && result.activeDurationSeconds >= 180 - 1e-6,
                environment: {
                    userAgent: navigator.userAgent, width: options.host.clientWidth, height: options.host.clientHeight,
                    devicePixelRatio: devicePixelRatio || 1, resolution: Math.min(devicePixelRatio || 1, 2)
                }
            });
            options.onComplete(result);
        }
    }
    function tick() {
        if (!started || destroyed) return;
        const wasRunning = simulation?.world.phase === 'running';
        if (import.meta.env.VITE_TEST_MODE !== 'true') clock?.frame(performance.now());
        renderFrame(wasRunning);
    }
    const runtime: GameRuntime = {
        input,
        start() {
            if (started || destroyed) return;
            started = true;
            try {
                renderer!.attach();
                battleAudio.start();
                disposers.push(bindKeyboard(options.host, input,
                    () => simulation?.world.phase === 'running', () => runtime.pause(), ownedListeners));
                const onBlur = () => runtime.pause();
                const onVisibility = () => { if (document.visibilityState === 'hidden') runtime.pause(); };
                const onPageHide = () => runtime.destroy();
                ownedListeners.add(onBlur); ownedListeners.add(onVisibility); ownedListeners.add(onPageHide);
                window.addEventListener('blur', onBlur);
                document.addEventListener('visibilitychange', onVisibility);
                window.addEventListener('pagehide', onPageHide);
                disposers.push(
                    () => window.removeEventListener('blur', onBlur),
                    () => document.removeEventListener('visibilitychange', onVisibility),
                    () => window.removeEventListener('pagehide', onPageHide),
                );
                disposers.push(() => { ownedListeners.delete(onBlur); ownedListeners.delete(onVisibility); ownedListeners.delete(onPageHide); });
                disposers.push(installTestBridge(simulation!.world, (seconds) => clock?.advance(seconds), renderFrame, resourceCounts));
                renderFrame();
                options.host.focus();
                clock!.reset();
                ticker!.start();
            } catch (error) { runtime.destroy(); throw error; }
        },
        pause() {
            if (!started || destroyed || simulation?.world.phase !== 'running') return;
            battleAudio.pause();
            profiler?.resetFrameBoundary();
            simulation?.pause(); input.clear(); clock?.reset(); publishHud();
        },
        resume() {
            if (!started || destroyed || simulation?.world.phase !== 'paused' || document.visibilityState === 'hidden' || !document.hasFocus()) return;
            battleAudio.resume();
            profiler?.resetFrameBoundary();
            simulation?.resume(); input.clear(); clock?.reset();
            options.host.focus(); publishHud();
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            battleAudio.destroy();
            ticker?.stop(); ticker?.remove(tick); ticker?.destroy(); ticker = undefined;
            for (const dispose of disposers.splice(0)) dispose();
            input.clear(); events.clear(); navigation.clear();
            simulation?.abandon(); simulation = undefined; clock = undefined;
            renderer?.destroy(); renderer = undefined;
            if (import.meta.env.VITE_TEST_MODE === 'true') window.__lastGameResources = resourceCounts();
        },
    };
    try {
        renderer = await createRenderer(options.host, options.session.config);
        const systems: System[] = [
            () => { held = input.snapshot(); },
            (world) => spawnEnemies(world, random, nextId),
            (world, dt) => {
                const turn = Number(held.turnRight) - Number(held.turnLeft);
                world.player.angle += turn * world.player.turnSpeed * dt;
                if (held.forward) moveShip(world.player, world.player.speed * dt, world.config);
            },
            (world, dt) => steerEnemies(world, dt, navigation),
            (world) => {
                if (held.fireFront) tryFire(world, world.player, 'front', nextId, events.push);
                if (held.fireLeft) tryFire(world, world.player, 'left', nextId, events.push);
                if (held.fireRight) tryFire(world, world.player, 'right', nextId, events.push);
                fireShooters(world, nextId, events.push);
            },
            (world, dt, finish) => advanceProjectiles(world, dt, events.push, finish),
            (world, _dt, finish) => resolveChaserContacts(world, events.push, finish),
        ];
        simulation = createSimulation(options.session.config, systems, (result) => {
            input.clear(); clock?.reset(); publishHud(); completedResult = result;
        });
        prepareTestScene(simulation.world, options.session.testSetup, nextId);
        clock = createClock((dt) => simulation?.step(dt), () => simulation?.world.phase === 'running');
        ticker = new Ticker(); ticker.add(tick);
        return runtime;
    } catch (error) { runtime.destroy(); throw error; }
}
