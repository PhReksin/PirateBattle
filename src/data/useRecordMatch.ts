import { dataService } from '../app/dataService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MatchRecord } from './contracts';
import { isTransientFailure, postMatch } from './api';
import { updateJournal, reportStorageError } from './clientStorage';

interface SubmissionAttempt { match: MatchRecord; generation: number }
function current(generation: number) {
    const service = dataService.getSnapshot();
    return service.apiReady && service.generation === generation;
}
export function useRecordMatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ['record-match'],
        mutationFn: async ({ match, generation }: SubmissionAttempt) => {
            if (!current(generation)) throw new Error('This registration belongs to an earlier demo dataset.');
            updateJournal((journal) => {
                const pending = journal.outbox[match.matchId];
                if (pending) { pending.attempts += 1; pending.lastError = null; }
            });
            return postMatch(match);
        },
        retry: (count, error) => count < 2 && isTransientFailure(error),
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
        onSuccess: async (record, { generation }) => {
            if (!current(generation)) return;
            try { updateJournal((journal) => { delete journal.outbox[record.matchId]; }); }
            catch (error) { reportStorageError(error); }
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['ranking'] }),
                queryClient.cancelQueries({ queryKey: ['history'] }),
            ]);
            if (!current(generation)) return;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['ranking'] }),
                queryClient.invalidateQueries({ queryKey: ['history'] }),
            ]);
        },
        onError: (error, { match, generation }) => {
            if (!current(generation)) return;
            try {
                updateJournal((journal) => {
                    const pending = journal.outbox[match.matchId];
                    if (pending) pending.lastError = error instanceof Error ? error.message : 'Registration failed.';
                });
            } catch (cause) { reportStorageError(cause); }
        },
    });
}