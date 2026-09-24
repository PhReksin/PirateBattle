import { loadIdentity } from '../data/identity';
import { loadOptions } from '../data/options';
import { createConfigSnapshot } from '../game/config';
import { initializeDatabase, readSnapshot } from '../mocks/database';
import { worker } from '../mocks/browser';

let state = { apiReady: false, error: null as string | null, generation: 0 };
const listeners = new Set<() => void>();
let pending: Promise<void> | undefined;
function publish(next: typeof state) { state = next; for (const listener of listeners) listener(); }
export const dataService = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    beginReset() { publish({ ...state, apiReady: false, generation: state.generation + 1 }); },
    finishReset(generation: number) { publish({ apiReady: true, error: null, generation }); },
    failReset(error: unknown) { pending = undefined; publish({ ...state, apiReady: false, error: String(error) }); },
    start(): Promise<void> {
        if (pending) return pending;
        pending = (async () => {
            try {
                await initializeDatabase(loadIdentity(), createConfigSnapshot(loadOptions()));
                // This challenge also uses MSW in the published demo.
                await worker.start({
                    onUnhandledRequest: 'bypass', quiet: true,
                    serviceWorker: { url: import.meta.env.BASE_URL + 'mockServiceWorker.js' }
                });
                const snapshot = await readSnapshot();
                publish({ apiReady: true, error: null, generation: snapshot.generation });
            } catch (error) {
                pending = undefined;
                publish({ ...state, apiReady: false, error: error instanceof Error ? error.message : 'Data service could not start.' });
                throw error;
            }
        })();
        return pending;
    },
};