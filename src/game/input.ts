export const ACTIONS = [
    'forward', 'turnLeft', 'turnRight', 'fireFront', 'fireLeft', 'fireRight',
] as const;
export type Action = typeof ACTIONS[number];
export type InputSnapshot = Record<Action, boolean>;

export function createInput() {
    const sources = new Map<Action, Set<string>>(ACTIONS.map((action) => [action, new Set()]));
    return {
        set(action: Action, source: string, held: boolean) {
            const set = sources.get(action)!;
            if (held) set.add(source);
            else set.delete(source);
        },
        clear() { for (const set of sources.values()) set.clear(); },
        snapshot(): InputSnapshot {
            return Object.fromEntries(
                ACTIONS.map((action) => [action, sources.get(action)!.size > 0]),
            ) as InputSnapshot;
        },
    };
}
export type InputController = ReturnType<typeof createInput>;

const KEYS: Partial<Record<string, Action>> = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyA: 'turnLeft', ArrowLeft: 'turnLeft',
    KeyD: 'turnRight', ArrowRight: 'turnRight',
    Space: 'fireFront', KeyQ: 'fireLeft', KeyE: 'fireRight',
};

export function bindKeyboard(
    host: HTMLElement, input: InputController,
    isRunning: () => boolean, pause: () => void,
    ownedListeners?: Set<EventListener>,
) {
    function keydown(event: KeyboardEvent) {
        if (!isRunning() || document.activeElement !== host || event.repeat) return;
        if (event.code === 'KeyP' || event.code === 'Escape') {
            event.preventDefault();
            pause();
            return;
        }
        const action = KEYS[event.code];
        if (!action) return;
        event.preventDefault();
        input.set(action, 'key:' + event.code, true);
    }
    function keyup(event: KeyboardEvent) {
        const action = KEYS[event.code];
        if (action) input.set(action, 'key:' + event.code, false);
    }
    ownedListeners?.add(keydown as EventListener); ownedListeners?.add(keyup as EventListener);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    return () => {
        ownedListeners?.delete(keydown as EventListener); ownedListeners?.delete(keyup as EventListener);
        window.removeEventListener('keydown', keydown);
        window.removeEventListener('keyup', keyup);
        input.clear();
    };
}