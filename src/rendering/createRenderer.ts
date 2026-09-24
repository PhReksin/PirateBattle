import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import type { GameConfig } from '../game/config';
import type { World } from '../game/types';
import { ASSET_URLS } from './assets';
import { followCamera } from './presentation';
import { createScenery } from './scenery';
import { createShipView } from './shipView';
import { createEffects } from './effects';
import type { GameEvent } from '../game/events';

export async function createRenderer(host: HTMLElement, config: GameConfig) {
    const app = new Application();
    let initialized = false;
    let attached = false;
    let destroyed = false;
    let observer: ResizeObserver | undefined;
    let resize: (() => void) | undefined;
    const shipViews = new Map<string, ReturnType<typeof createShipView>>();
    let effects: ReturnType<typeof createEffects> | undefined;
    const projectileSprites = new Map<string, Sprite>();

    function destroy() {
        if (destroyed) return;
        destroyed = true;
        observer?.disconnect();
        if (resize) window.removeEventListener('resize', resize);

        for (const view of shipViews.values()) view.destroy();
        shipViews.clear();
        effects?.destroy();
        projectileSprites.clear();

        if (initialized) {
            app.destroy(true, {
                children: true,
                texture: false,
                textureSource: false,
            });
        } else {
            // Initialization can fail after allocating a renderer or ticker.
            app.ticker?.destroy();
            app.stage.destroy({ children: true });
            app.renderer?.destroy(true);
        }
    }

    try {
        await app.init({
            width: config.arena.width,
            height: config.arena.height,
            autoStart: false,
            sharedTicker: false,
            preference: 'webgl',
            autoDensity: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            backgroundColor: 0x102c3b,
        });
        initialized = true;

        const world = new Container();
        app.stage.addChild(world);

        const scenery = createScenery(world, config);
        let cameraTarget = { ...config.player.start };
        function updateCamera() {
            const transform = followCamera(host.clientWidth, host.clientHeight, config.arena, cameraTarget);
            world.scale.set(transform.scale);
            world.position.set(transform.x, transform.y);
        }

        const shipsLayer = new Container();
        const trails = new Graphics();
        const projectilesLayer = new Container();
        const effectsLayer = new Container();
        world.addChild(shipsLayer, trails, projectilesLayer, effectsLayer);
        effects = createEffects(effectsLayer);

        function removeMissingSprites(
            sprites: Map<string, Sprite>,
            liveIds: Set<string>,
        ): void {
            for (const [id, sprite] of sprites) {
                if (liveIds.has(id)) continue;
                sprite.removeFromParent();
                sprite.destroy({ texture: false, textureSource: false });
                sprites.delete(id);
            }
        }

        function render(state: World, events: readonly GameEvent[] = []): void {
            if (destroyed) return;

            cameraTarget = state.player;
            updateCamera();
            scenery.update(state.activeSeconds);
            const liveShipIds = new Set<string>();
            for (const ship of [state.player, ...state.enemies]) {
                if (!ship.alive) continue;
                liveShipIds.add(ship.id);

                let view = shipViews.get(ship.id);
                if (!view) {
                    view = createShipView(ship.kind);
                    shipsLayer.addChild(view.root);
                    shipViews.set(ship.id, view);
                }
                view.update(ship, state.activeSeconds);
            }
            for (const [id, view] of shipViews) {
                if (liveShipIds.has(id)) continue;
                view.destroy();
                shipViews.delete(id);
            }

            trails.clear();
            const liveProjectileIds = new Set<string>();
            for (const shot of state.projectiles) {
                if (!shot.alive) continue;
                liveProjectileIds.add(shot.id);

                let sprite = projectileSprites.get(shot.id);
                if (!sprite) {
                    const texture = Assets.get<Texture>(ASSET_URLS.cannonball);
                    sprite = new Sprite(texture);
                    sprite.anchor.set(0.5);
                    projectilesLayer.addChild(sprite);
                    projectileSprites.set(shot.id, sprite);
                }

                const length = Math.min(shot.distance, 24);
                trails.moveTo(shot.x - shot.direction.x * length, shot.y - shot.direction.y * length)
                    .lineTo(shot.x, shot.y).stroke({ width: 1.5, color: 0xe9ffff, alpha: 0.5 });
                sprite.position.set(shot.x, shot.y);
                sprite.scale.set(
                    shot.radius * 2 / Math.max(sprite.texture.width, sprite.texture.height),
                );
            }
            removeMissingSprites(projectileSprites, liveProjectileIds);

            for (const event of events) effects?.emit(event);
            effects?.update(state.activeSeconds);
            app.render();
        }

        resize = () => {
            if (destroyed || !attached) return;

            const width = host.clientWidth;
            const height = host.clientHeight;
            if (width <= 0 || height <= 0) return;

            const resolution = Math.min(window.devicePixelRatio || 1, 2);
            app.renderer.resize(width, height, resolution);

            updateCamera();
            app.render();
        };

        return {
            attach() {
                if (destroyed || attached) return;
                attached = true;
                host.appendChild(app.canvas);
                observer = new ResizeObserver(() => resize?.());
                observer.observe(host);
                window.addEventListener('resize', resize!);
                resize!();
            },
            render,
            counts() {
                return {
                    shipViews: shipViews.size, projectileViews: projectileSprites.size,
                    effects: effects?.count() ?? 0, resizeListeners: !destroyed && attached && resize ? 1 : 0
                };
            },
            destroy,
        };
    } catch (error) {
        destroy();
        throw error;
    }
}