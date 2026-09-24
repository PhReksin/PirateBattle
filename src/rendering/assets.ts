import { readTestSetup } from '../testing/scenarios';
import { Assets } from 'pixi.js';
import type { Texture } from 'pixi.js';

import { ISLAND_TILE_GRID } from './presentation';

const png = '/assets/png/retina/';
export const ISLAND_TEXTURES = Object.fromEntries(ISLAND_TILE_GRID.flat()
    .map((id) => [id, png + 'tiles/tile_' + id + '.png']));
export const ASSET_URLS = {
    water: png + 'tiles/tile_73.png',
    ...ISLAND_TEXTURES,
    palm: png + 'tiles/tile_71.png',
    rock: png + 'tiles/tile_66.png',
    player: png + 'ships/ship_2.png',
    playerDamaged: png + 'ships/ship_8.png',
    playerCritical: png + 'ships/ship_14.png',
    chaser: png + 'ships/ship_5.png',
    chaserDamaged: png + 'ships/ship_11.png',
    chaserCritical: png + 'ships/ship_17.png',
    shooter: png + 'ships/ship_3.png',
    shooterDamaged: png + 'ships/ship_9.png',
    shooterCritical: png + 'ships/ship_15.png',
    wood1: png + 'ship_parts/wood_1.png',
    wood2: png + 'ship_parts/wood_2.png',
    wood3: png + 'ship_parts/wood_3.png',
    cannonLoose: png + 'ship_parts/cannon_loose.png',
    cannonball: png + 'ship_parts/cannon_ball.png',
    fire1: png + 'effects/fire_1.png',
    fire2: png + 'effects/fire_2.png',
    explosion1: png + 'effects/explosion_1.png',
    explosion2: png + 'effects/explosion_2.png',
    explosion3: png + 'effects/explosion_3.png',
    enemyHealthFrame: png + 'ui/hud/enemy_health_frame.png',
    enemyHealthFill: png + 'ui/hud/enemy_health_fill_red.png',
    playerHealthFill: png + 'ui/hud/health_fill_green.png',
};

// DOM artwork shares the preload barrier, so the match cannot start with missing HUD art.
export const UI_ASSETS = {
    healthFrame: png + 'ui/hud/health_frame.png',
    healthGreen: png + 'ui/hud/health_fill_green.png',
    healthAmber: png + 'ui/hud/health_fill_amber.png',
    healthRed: png + 'ui/hud/health_fill_red.png',
    heart: png + 'ui/hud/icon_heart.png',
    score: png + 'ui/hud/icon_score.png',
    time: png + 'ui/hud/icon_time.png',
    counter: png + 'ui/hud/counter_panel.png',
    round: png + 'ui/controls/button_round_normal.png',
    roundHover: png + 'ui/controls/button_round_hover.png',
    roundPressed: png + 'ui/controls/button_round_pressed.png',
    pause: png + 'ui/controls/icon_pause.png',
    home: png + 'ui/controls/icon_home.png',
    forward: png + 'ui/controls/icon_forward.png',
    turnLeft: png + 'ui/controls/icon_turn_left.png',
    turnRight: png + 'ui/controls/icon_turn_right.png',
    fireFront: png + 'ui/controls/icon_fire_front.png',
    fireLeft: png + 'ui/controls/icon_fire_left.png',
    fireRight: png + 'ui/controls/icon_fire_right.png',
    panel: png + 'ui/menu/panel_menu.png',
    primary: png + 'ui/menu/button_primary_normal.png',
    secondary: png + 'ui/menu/button_secondary_normal.png',
};

export const SHIP_TEXTURES = {
    player: [ASSET_URLS.player, ASSET_URLS.playerDamaged, ASSET_URLS.playerCritical],
    chaser: [ASSET_URLS.chaser, ASSET_URLS.chaserDamaged, ASSET_URLS.chaserCritical],
    shooter: [ASSET_URLS.shooter, ASSET_URLS.shooterDamaged, ASSET_URLS.shooterCritical],
} as const;

type ProgressListener = (progress: number) => void;
const listeners = new Set<ProgressListener>();
let progress = 0;
let failedOnce = false;
let pending: Promise<Record<string, Texture>> | undefined;

export async function loadGameAssets(report: ProgressListener) {
    listeners.add(report);
    report(progress);
    if (!pending) {
        const urls = [...Object.values(ASSET_URLS), ...Object.values(UI_ASSETS)];
        if (readTestSetup(location.search)?.assetFailOnce && !failedOnce) {
            failedOnce = true;
            urls[0] = '/assets/missing-test-image.png';
        }
        pending = Assets.load<Texture>(
            urls,
            (value: number) => {
                progress = value;
                for (const listener of listeners) listener(value);
            },
        ).catch((error: unknown) => {
            pending = undefined;
            progress = 0;
            throw error;
        });
    }
    try { return await pending; }
    finally { listeners.delete(report); }
}