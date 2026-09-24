import { Assets, Container, Graphics, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import type { Ship } from '../game/types';
import { ASSET_URLS, SHIP_TEXTURES } from './assets';
import { damageStage } from './presentation';

export function createShipView(kind: Ship['kind']) {
    const root = new Container();
    const hull = new Container();
    const textures = SHIP_TEXTURES[kind].map((url) => Assets.get<Texture>(url));
    const shadow = new Sprite(textures[0]);
    const sprite = new Sprite(textures[0]);
    const fire = new Sprite(Assets.get<Texture>(ASSET_URLS.fire1));
    const health = new Container();
    const frame = new Sprite(Assets.get<Texture>(ASSET_URLS.enemyHealthFrame));
    const fill = kind !== 'player' ? new Sprite(Assets.get<Texture>(ASSET_URLS.enemyHealthFill)) : new Sprite(Assets.get<Texture>(ASSET_URLS.playerHealthFill));
    const clip = new Graphics();
    shadow.anchor.set(0.5); shadow.tint = 0x123c49; shadow.alpha = 0.26;
    shadow.position.set(3, 4);
    sprite.anchor.set(0.5);
    fire.anchor.set(0.5, 0.85);
    hull.addChild(shadow, sprite);
    // The fill PNG is a full-frame overlay, not a cropped red rectangle.
    frame.width = fill.width = 40;
    frame.height = fill.height = 10;
    fill.mask = clip;
    health.addChild(frame, fill, clip);
    health.visible = true;
    // health.visible = kind !== 'player';
    root.addChild(hull, fire, health);
    let previousHp = -1;
    let previousMaxHp = -1;
    let flashUntil = 0;
    return {
        root,
        update(ship: Ship, time: number) {
            root.position.set(ship.x, ship.y);
            hull.rotation = ship.angle - Math.PI / 2;
            const fraction = Math.max(0, Math.min(1, ship.hp / ship.maxHp));
            const texture = textures[damageStage(ship.hp, ship.maxHp)];
            sprite.texture = shadow.texture = texture;
            const scale = ship.radius * 2 / Math.max(texture.width, texture.height);
            sprite.scale.set(scale); shadow.scale.set(scale);
            if (previousHp >= 0 && ship.hp < previousHp) flashUntil = time + 0.12;
            sprite.tint = time < flashUntil ? 0xffb59c : 0xffffff;
            fire.visible = fraction <= 0.3;
            fire.texture = Assets.get<Texture>(Math.floor(time * 8) % 2 ? ASSET_URLS.fire1 : ASSET_URLS.fire2);
            fire.scale.set(ship.radius * 1.25 / fire.texture.height);
            fire.position.set(2, -2);
            if (ship.hp !== previousHp || ship.maxHp !== previousMaxHp) {
                // ui_sheet.json: fill_rect = (24,12,112,15) in a 160×40 frame.
                clip.clear().rect(6, 3, 28 * fraction, 3.75).fill(0xffffff);
                previousHp = ship.hp;
                previousMaxHp = ship.maxHp;
            }
            health.position.set(-20, -ship.radius - 15);
        },
        destroy() { root.destroy({ children: true, texture: false, textureSource: false }); },
    };
}