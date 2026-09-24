const base = (import.meta.env?.BASE_URL ?? '/') + 'assets/sounds/';

export const SOUNDS = {
    playerShot: { file: 'cannon_fire_1.wav', gain: 0.65, gap: 0.025 },
    playerBroadside: { file: 'cannon_broadside.wav', gain: 0.65, gap: 0.025 },
    enemyShot: { file: 'cannon_fire_3.wav', gain: 0.42, gap: 0.06 },
    woodHit: { file: 'ship_wood_hit_1.wav', gain: 0.55, gap: 0.045 },
    collision: { file: 'ship_collision.wav', gain: 0.6, gap: 0.06 },
    splash: { file: 'cannonball_water_hit_1.wav', gain: 0.3, gap: 0.06 },
    destroyed: { file: 'ship_explosion_1.wav', gain: 0.75, gap: 0.045 },
    click: { file: 'ui_click.wav', gain: 0.45, gap: 0.04 },
    hover: { file: 'ui_hover.wav', gain: 0.14, gap: 0.09 },
    ocean: { file: 'ocean_ambience_loop.wav', gain: 0.2, gap: 0 },
} as const;

export type SoundName = keyof typeof SOUNDS;
export function soundUrl(name: SoundName) { return base + SOUNDS[name].file; }