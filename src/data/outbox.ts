import type { MatchRecord } from './contracts';
import { readJournal } from './clientStorage';

export function createOutbox(send: (match: MatchRecord) => Promise<MatchRecord>) {
    const inFlight = new Map<string, Promise<MatchRecord>>();
    let paused = false;
    let generation = 0;
    return {
        pause() { paused = true; },
        resume() { paused = false; },
        invalidate() { generation++; inFlight.clear(); },
        send(id: string): Promise<MatchRecord> | undefined {
            if (paused) return undefined;
            const captured = generation;
            const existing = inFlight.get(id);
            if (existing) return existing;
            const pending = readJournal().outbox[id];
            if (!pending) return undefined;
            const request = Promise.resolve().then(() => {
                if (paused || captured !== generation) throw new Error('Delivery cancelled by reset.');
                return send(pending.match);
            })
                .finally(() => { if (inFlight.get(id) === request) inFlight.delete(id); });
            inFlight.set(id, request);
            return request;
        },
        async drain() {
            if (paused) return;
            const captured = generation;
            const ids = Object.keys(readJournal().outbox);
            for (const id of ids) {
                if (paused || captured !== generation) return;
                try { await this.send(id); }
                catch { /* Error is visible in the journal; continue to the next match. */ }
            }
        },
    };
}