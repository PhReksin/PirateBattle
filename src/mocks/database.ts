import type { MatchRecord } from '../data/contracts';
import { canonicalJson } from '../data/configKey';
import type { PlayerIdentity } from '../data/identity';
import type { GameConfig } from '../game/config';
import { createFixtures } from './fixtures';

let opening: Promise<IDBDatabase> | undefined;
export function openDatabase(): Promise<IDBDatabase> {
    if (!opening) {
        opening = new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('pirate-battle-mock', 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore('matches', { keyPath: 'matchId' });
                request.result.createObjectStore('meta');
            };
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                request.result.onversionchange = () => request.result.close();
                resolve(request.result);
            };
        }).catch((error: unknown) => { opening = undefined; throw error; });
    }
    return opening;
}

export class DatabaseConflict extends Error { }

export async function insertOrGet(match: MatchRecord, expectedGeneration: number) {
    const db = await openDatabase();
    return new Promise<{ record: MatchRecord; created: boolean }>((resolve, reject) => {
        const transaction = db.transaction(['matches', 'meta'], 'readwrite');
        const matches = transaction.objectStore('matches');
        const meta = transaction.objectStore('meta');
        let result = { record: match, created: false };
        let failure: Error | undefined;
        const generation = meta.get('generation');
        generation.onsuccess = () => {
            if ((generation.result ?? 0) !== expectedGeneration) {
                failure = new DatabaseConflict('The demo database was reset.');
                transaction.abort();
                return;
            }
            const existingRequest = matches.get(match.matchId);
            existingRequest.onsuccess = () => {
                const existing = existingRequest.result as MatchRecord | undefined;
                if (existing) {
                    if (canonicalJson(existing) !== canonicalJson(match)) {
                        failure = new DatabaseConflict('This match ID already has a different result.');
                        transaction.abort();
                    } else result = { record: existing, created: false };
                    return;
                }
                matches.add(match);
                result = { record: match, created: true };
                const revision = meta.get('revision');
                revision.onsuccess = () => meta.put((revision.result ?? 0) + 1, 'revision');
            };
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Registration failed.'));
        transaction.onerror = () => { /* onabort reports the transaction failure. */ };
    });
}

export async function readSnapshot(): Promise<{ records: MatchRecord[]; revision: number; generation: number }> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['matches', 'meta'], 'readonly');
        const records = tx.objectStore('matches').getAll();
        const revision = tx.objectStore('meta').get('revision');
        const generation = tx.objectStore('meta').get('generation');
        tx.oncomplete = () => resolve({
            records: records.result as MatchRecord[],
            revision: Number(revision.result ?? 0), generation: Number(generation.result ?? 0)
        });
        tx.onabort = () => reject(tx.error ?? new Error('Could not read demo data.'));
        tx.onerror = () => { };
    });
}

export async function initializeDatabase(player: PlayerIdentity, config: GameConfig): Promise<void> {
    const fixtures = await createFixtures(player, config);
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['matches', 'meta'], 'readwrite');
        const meta = tx.objectStore('meta');
        const initialized = meta.get('initialized');
        initialized.onsuccess = () => {
            if (initialized.result) return;
            for (const match of fixtures) tx.objectStore('matches').add(match);
            meta.put(true, 'initialized'); meta.put(1, 'schema');
            meta.put(1, 'revision'); meta.put(0, 'generation');
        };
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error ?? new Error('Could not initialize demo data.'));
        tx.onerror = () => { };
    });
}

export async function resetDatabase(records: MatchRecord[]): Promise<number> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['matches', 'meta'], 'readwrite');
        const matches = tx.objectStore('matches');
        const meta = tx.objectStore('meta');
        const generation = meta.get('generation');
        let next = 0;
        generation.onsuccess = () => {
            next = Number(generation.result ?? 0) + 1;
            matches.clear(); for (const match of records) matches.add(match);
            meta.put(next, 'generation'); meta.put(true, 'initialized');
            const revision = meta.get('revision');
            revision.onsuccess = () => meta.put(Number(revision.result ?? 0) + 1, 'revision');
        };
        tx.oncomplete = () => resolve(next);
        tx.onabort = () => reject(tx.error ?? new Error('Could not reset demo data.'));
        tx.onerror = () => { };
    });
}