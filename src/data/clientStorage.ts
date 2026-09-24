import type { MatchRecord } from './contracts';
import { isMatchRecord } from './validation';

interface PendingRecord { match: MatchRecord; attempts: number; lastError: string | null }
export interface ClientJournal {
    version: 1;
    generation: number;
    lastResult: MatchRecord | null;
    showResultOnBoot: boolean;
    outbox: Record<string, PendingRecord>;
}
const KEY = 'pirate-battle:journal:v1';
export const JOURNAL_EVENT = 'pirate-battle:journal-changed';

export function readJournal(): ClientJournal {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, generation: 0, lastResult: null, showResultOnBoot: false, outbox: {} };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') throw new Error('Saved journal is invalid.');
    const journal = value as ClientJournal;
    if (journal.version !== 1 || typeof journal.showResultOnBoot !== 'boolean' ||
        (journal.lastResult !== null && !isMatchRecord(journal.lastResult)) ||
        !journal.outbox || typeof journal.outbox !== 'object' || Array.isArray(journal.outbox)) {
        throw new Error('Saved journal is invalid.');
    }
    journal.generation ??= 0; // Upgrade an existing Step 16 journal.
    if (!Number.isInteger(journal.generation) || journal.generation < 0) throw new Error('Invalid journal generation.');
    for (const [id, pending] of Object.entries(journal.outbox)) {
        if (!pending || !isMatchRecord(pending.match) || pending.match.matchId !== id ||
            !Number.isInteger(pending.attempts) || pending.attempts < 0 ||
            (pending.lastError !== null && typeof pending.lastError !== 'string')) {
            throw new Error('Saved pending registration is invalid.');
        }
    }
    return journal;
}

export function updateJournal(change: (journal: ClientJournal) => void) {
    const journal = readJournal();
    change(journal);
    localStorage.setItem(KEY, JSON.stringify(journal));
    refreshJournal();
    return journal;
}

export function queueCompletedMatch(match: MatchRecord) {
    if (!isMatchRecord(match)) throw new Error('Completed match is invalid.');
    return updateJournal((journal) => {
        journal.lastResult = match;
        journal.showResultOnBoot = true;
        journal.outbox[match.matchId] ??= { match, attempts: 0, lastError: null };
    });
}

const emptyJournal = (): ClientJournal => ({ version: 1, generation: 0, lastResult: null, showResultOnBoot: false, outbox: {} });
function loadState() {
    try { return { journal: readJournal(), storageError: null as string | null }; }
    catch (error) { return { journal: emptyJournal(), storageError: String(error) }; }
}
let state = { ...loadState(), sending: new Set<string>() };
const listeners = new Set<() => void>();
function notify() { for (const listener of listeners) listener(); }
export const journalStore = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
export function refreshJournal() { state = { ...state, ...loadState() }; notify(); }
export function reportStorageError(error: unknown) {
    state = { ...state, storageError: error instanceof Error ? error.message : String(error) }; notify();
}
export function setSending(id: string, sending: boolean) {
    const ids = new Set(state.sending);
    if (sending) ids.add(id); else ids.delete(id);
    state = { ...state, sending: ids }; notify();
}

export function resetJournal(generation: number) {
    localStorage.setItem(KEY, JSON.stringify({ ...emptyJournal(), generation }));
    refreshJournal();
}