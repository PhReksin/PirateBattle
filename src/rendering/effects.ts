import { Assets, Container, Graphics, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import type { GameEvent } from '../game/events';
import { ASSET_URLS } from './assets';

interface Effect {
    view: Sprite | Graphics;
    kind: 'explosion' | 'flash' | 'debris';
    at: number; lifetime: number;
    x: number; y: number; vx: number; vy: number; spin: number; size: number;
}

export function createEffects(layer: Container) {
    const frames = [ASSET_URLS.explosion1, ASSET_URLS.explosion2, ASSET_URLS.explosion3]
        .map((url) => Assets.get<Texture>(url));
    const parts = [ASSET_URLS.wood1, ASSET_URLS.wood2, ASSET_URLS.wood3, ASSET_URLS.cannonLoose]
        .map((url) => Assets.get<Texture>(url));
    const live: Effect[] = [];
    function remove(index: number) {
        live[index].view.destroy({ texture: false, textureSource: false });
        live.splice(index, 1);
    }
    function add(effect: Effect) {
        if (live.length >= 128) remove(0);
        effect.view.position.set(effect.x, effect.y);
        layer.addChild(effect.view);
        live.push(effect);
    }
    return {
        emit(event: GameEvent) {
            if (event.type === 'shot') return;
            const explosion = event.type === 'explosion';
            if (event.type === 'damage' || explosion) {
                const count = explosion ? 9 : 3;
                for (let index = 0; index < count; index++) {
                    // Coordinate/time-derived variation keeps the gameplay RNG untouched.
                    const angle = index * 2.39996 + event.x * 0.07 + event.at;
                    const speed = (explosion ? 28 : 17) + index * 2;
                    const view = new Sprite(parts[index % parts.length]);
                    view.anchor.set(0.5);
                    add({
                        view, kind: 'debris', at: event.at, lifetime: explosion ? 1.5 : 0.85,
                        x: event.x, y: event.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        spin: index % 2 ? 3 : -2, size: index % 4 === 3 ? 8 : 12
                    });
                }
                if (!explosion) return;
            }
            const view = explosion ? new Sprite(frames[0]) :
                new Graphics().circle(0, 0, event.type === 'muzzle' ? 3 : 4)
                    .fill({ color: event.type === 'muzzle' ? 0xffeab1 : 0xe3f5ff, alpha: 0.8 });
            if (view instanceof Sprite) view.anchor.set(0.5);
            add({
                view, kind: explosion ? 'explosion' : 'flash', at: event.at,
                lifetime: explosion ? 0.5 : 0.16, x: event.x, y: event.y,
                vx: 0, vy: 0, spin: 0, size: explosion ? 42 : 1
            });
        },
        update(time: number) {
            for (let index = live.length - 1; index >= 0; index--) {
                const effect = live[index];
                const age = Math.max(0, time - effect.at);
                const fraction = age / effect.lifetime;
                if (fraction >= 1) { remove(index); continue; }
                if (effect.view instanceof Sprite) {
                    if (effect.kind === 'explosion') effect.view.texture = frames[Math.min(2, Math.floor(fraction * 3))];
                    effect.view.scale.set(effect.size / Math.max(effect.view.texture.width, effect.view.texture.height)
                        * (effect.kind === 'explosion' ? 1 + fraction * 0.5 : 1));
                } else effect.view.scale.set(1 + fraction);
                effect.view.position.set(effect.x + effect.vx * age, effect.y + effect.vy * age);
                effect.view.rotation = effect.spin * age;
                effect.view.alpha = effect.kind === 'debris' ? Math.min(1, (1 - fraction) * 2) : 1 - fraction;
            }
        },
        count() { return live.length; },
        destroy() { while (live.length) remove(live.length - 1); },
    };
}