import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useRecordMatch } from '../data/useRecordMatch';
import { createOutbox } from '../data/outbox';
import { journalStore, refreshJournal, resetJournal, queueCompletedMatch, reportStorageError, setSending, updateJournal } from '../data/clientStorage';
import type { MatchRecord } from '../data/contracts';
import { dataService } from './dataService';
import { SubmissionContext } from './submission';
import { scenarios } from '../mocks/scenarios';
import { resetDatabase } from '../mocks/database';
import { createFixtures } from '../mocks/fixtures';
import { loadIdentity } from '../data/identity';
import { loadOptions } from '../data/options';
import { createConfigSnapshot } from '../game/config';
import { queryClient } from './queryClient';

export function SubmissionProvider({ children }: { children: ReactNode }) {
    const state = useSyncExternalStore(journalStore.subscribe, journalStore.getSnapshot);
    const service = useSyncExternalStore(dataService.subscribe, dataService.getSnapshot);
    const { mutateAsync } = useRecordMatch();
    const [outbox] = useState(() => createOutbox(async (match) => {
        setSending(match.matchId, true);
        try { return await mutateAsync({ match, generation: dataService.getSnapshot().generation }); }
        finally { setSending(match.matchId, false); }
    }));
    const drain = useCallback(() => {
        const service = dataService.getSnapshot();
        if (!service.apiReady) return;
        try {
            refreshJournal();
            const local = journalStore.getSnapshot();
            if (local.storageError) throw new Error(local.storageError);
            // Recover a refresh between the reset transaction and clearing local storage.
            if (journalStore.getSnapshot().journal.generation !== service.generation) resetJournal(service.generation);
            void outbox.drain().catch(reportStorageError);
        } catch (error) { reportStorageError(error); }
    }, [outbox]);
    useEffect(() => {
        if (service.apiReady) { outbox.resume(); drain(); }
        window.addEventListener('online', drain);
        return () => window.removeEventListener('online', drain);
    }, [service.apiReady, drain, outbox]);
    useEffect(() => scenarios.subscribe(() => {
        if (scenarios.getSelected() === 'success') {
            drain();
            void queryClient.cancelQueries().then(() => queryClient.invalidateQueries());
        }
    }), [drain]);
    const reset = useCallback(async (dataset: 'empty' | 'multiple-pages', seed: number) => {
        // Hash fixtures before opening the write transaction.
        const records = dataset === 'empty' ? [] : await createFixtures(loadIdentity(), createConfigSnapshot(loadOptions()), seed);
        outbox.pause(); outbox.invalidate(); dataService.beginReset();
        try {
            await queryClient.cancelQueries();
            const generation = await resetDatabase(records);
            resetJournal(generation); scenarios.resetCounters(); queryClient.clear();
            dataService.finishReset(generation); outbox.resume();
        } catch (error) { dataService.failReset(error); reportStorageError(error); throw error; }
    }, [outbox]);
    const complete = useCallback((match: MatchRecord) => {
        try { queueCompletedMatch(match); drain(); }
        catch (error) { reportStorageError(error); }
    }, [drain]);
    const retry = useCallback((id: string) => {
        if (!dataService.getSnapshot().apiReady) return;
        try { void outbox.send(id)?.catch(() => { }); } catch (error) { reportStorageError(error); }
    }, [outbox]);
    const leaveResult = useCallback(() => {
        try { updateJournal((journal) => { journal.showResultOnBoot = false; }); }
        catch (error) { reportStorageError(error); }
    }, []);
    return <SubmissionContext.Provider value={{ ...state, complete, retry, leaveResult, reset }}>{children}</SubmissionContext.Provider>;
}