import { createAudioEngine } from './audioEngine';
import type { AudioScope, AudioSettings } from './audioEngine';
import type { GameEvent } from '../game/events';
import type { SoundName } from './sounds';

const storageKey = 'pirate-battle.audio.v1';
function readSettings(): AudioSettings {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        if (typeof value === 'object' && value !== null && 'muted' in value && 'volume' in value &&
            typeof value.muted === 'boolean' && typeof value.volume === 'number' &&
            Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 1) {
            return { muted: value.muted, volume: value.volume };
        }
    } catch { /* Storage may be unavailable. */ }
    return { muted: false, volume: 0.7 };
}
let settings = readSettings();
let engine: ReturnType<typeof createAudioEngine> | undefined;
let battleOwner: symbol | undefined;
let owners = 0;
let removeListeners: (() => void) | undefined;
const listeners = new Set<() => void>();

export const audioSettings = {
    getSnapshot: () => settings,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    set(next: AudioSettings) {
        if (!Number.isFinite(next.volume)) return;
        settings = { muted: next.muted, volume: Math.max(0, Math.min(1, next.volume)) };
        engine?.setSettings(settings);
        try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* Keep the in-memory setting. */ }
        for (const listener of listeners) listener();
    },
};

// One app-level owner keeps decoded sounds and the ocean loop across screen changes.
export function mountAudio() {
    if (owners++ === 0) {
        engine = createAudioEngine(settings);
        engine.preload();
        const unlock = () => engine?.unlock();
        const onKey = (event: KeyboardEvent) => { if (!event.repeat) unlock(); };
        const onVisibility = () => engine?.setAudible(document.visibilityState !== 'hidden' && document.hasFocus());
        const onBlur = () => engine?.setAudible(false);
        const onPageHide = () => engine?.setAudible(false);
        const buttonAt = (target: EventTarget | null) => {
            const button = target instanceof Element ? target.closest<HTMLButtonElement>('button') : null;
            return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true' &&
                !button.closest('.touch-controls') ? button : null;
        };
        const onClick = (event: MouseEvent) => {
            unlock();
            if (buttonAt(event.target)) engine?.play('click');
        };
        const onHover = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse') return;
            const button = buttonAt(event.target);
            if (button && !(event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) engine?.play('hover');
        };
        const onFocus = (event: FocusEvent) => { if (buttonAt(event.target)) engine?.play('hover'); };
        document.addEventListener('pointerdown', unlock, true);
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('pointerover', onHover, true);
        document.addEventListener('focusin', onFocus, true);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onVisibility);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('pageshow', onVisibility);
        onVisibility();
        removeListeners = () => {
            document.removeEventListener('pointerdown', unlock, true);
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('pointerover', onHover, true);
            document.removeEventListener('focusin', onFocus, true);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('focus', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener('pageshow', onVisibility);
        };
    }
    let disposed = false;
    return () => {
        if (disposed) return;
        disposed = true;
        if (--owners > 0) return;
        removeListeners?.(); removeListeners = undefined;
        engine?.destroy(); engine = undefined; battleOwner = undefined;
    };
}

export function soundForEvent(event: GameEvent): Exclude<SoundName, 'ocean'> | undefined {
    switch (event.type) {
        case 'shot': return event.kind === 'player' ? event.slot === 'front' ? 'playerShot' : 'playerBroadside' : 'enemyShot';
        case 'damage': return event.cause === 'ram' ? 'collision' : 'woodHit';
        case 'explosion': return 'destroyed';
        case 'impact': return event.surface === 'island' ? 'splash' : undefined;
        case 'muzzle': return undefined; // Broadside has three visual flashes but one sound.
    }
}

export function createBattleAudio() {
    const owner = Symbol('battle-audio');
    let scope: AudioScope = { active: true };
    let started = false;
    let disposed = false;
    let completed = false;
    return {
        start() {
            if (started || disposed) return;
            started = true; battleOwner = owner;
            engine?.setBattleRunning(true);
        },
        consume(events: readonly GameEvent[]) {
            if (!started || disposed || completed || !scope.active || battleOwner !== owner) return;
            for (const event of events) {
                const sound = soundForEvent(event);
                if (sound) engine?.play(sound, scope);
            }
        },
        pause() {
            if (disposed || battleOwner !== owner) return;
            scope.active = false;
            engine?.stopScope(scope);
            engine?.setBattleRunning(false);
        },
        resume() {
            if (disposed || completed || battleOwner !== owner) return;
            scope = { active: true };
            engine?.setBattleRunning(true);
        },
        complete() {
            completed = true;
            if (battleOwner === owner) engine?.setBattleRunning(false);
        },
        destroy() {
            if (disposed) return;
            disposed = true;
            // Let the final explosion finish over Result; abandonment stops combat immediately.
            if (!completed) { scope.active = false; engine?.stopScope(scope); }
            if (battleOwner === owner) { battleOwner = undefined; engine?.setBattleRunning(false); }
        },
    };
}