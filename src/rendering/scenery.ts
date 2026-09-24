import { Assets, Container, Graphics, Sprite, TilingSprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import type { GameConfig } from '../game/config';
import { ASSET_URLS, ISLAND_TEXTURES } from './assets';
import { ISLAND_TILE_GRID } from './presentation';

export function createScenery(parent: Container, config: GameConfig) {
    // Continue the sea outside the arena when the camera approaches a boundary.
    const margin = 4096;
    const water = new TilingSprite({
        texture: Assets.get<Texture>(ASSET_URLS.water),
        width: config.arena.width + margin * 2, height: config.arena.height + margin * 2
    });
    water.position.set(-margin, -margin);
    water.tileScale.set(0.5); // Retina PNG: 128 image pixels = 64 world units.
    water.tint = 0x86dfe3;
    parent.addChild(water);

    // A faint buoy line makes the real arena boundary visible in the closer view.
    const boundary = new Graphics().rect(0, 0, config.arena.width, config.arena.height)
        .stroke({ width: 1, color: 0xe1f4d4, alpha: 0.35 });
    for (let x = 0; x <= config.arena.width; x += 32) {
        boundary.circle(x, 0, 1.5).fill(0xe4d4a2);
        boundary.circle(x, config.arena.height, 1.5).fill(0xe4d4a2);
    }
    for (let y = 32; y < config.arena.height; y += 32) {
        boundary.circle(0, y, 1.5).fill(0xe4d4a2);
        boundary.circle(config.arena.width, y, 1.5).fill(0xe4d4a2);
    }
    parent.addChild(boundary);

    for (const island of config.islands) {
        const land = new Container();
        land.position.set(island.x, island.y);
        // A shallow-water halo is decorative; the solid tiles stay inside the collider.
        const surf = new Graphics().roundRect(-10, -10, island.width + 20, island.height + 20, 22)
            .fill({ color: 0xa4e3d5, alpha: 0.24 });
        land.addChild(surf);
        for (const [row, cells] of ISLAND_TILE_GRID.entries()) {
            for (const [column, id] of cells.entries()) {
                const tile = new Sprite(Assets.get<Texture>(ISLAND_TEXTURES[id]));
                tile.position.set(column * island.width / 4, row * island.height / 4);
                tile.width = island.width / 4;
                tile.height = island.height / 4;
                land.addChild(tile);
            }
        }
        const palm = new Sprite(Assets.get<Texture>(ASSET_URLS.palm));
        palm.anchor.set(0.5);
        palm.position.set(island.width * 0.32, island.height * 0.4);
        palm.width = 26; palm.height = 26;
        const rock = new Sprite(Assets.get<Texture>(ASSET_URLS.rock));
        rock.anchor.set(0.5);
        rock.position.set(island.width * 0.69, island.height * 0.64);
        rock.width = 18; rock.height = 18;
        land.addChild(palm, rock);
        parent.addChild(land);
    }
    return { update(time: number) { water.tilePosition.set(time * 1.4, time * 0.6); } };
}