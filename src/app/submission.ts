import { createContext, useContext } from 'react';
import type { MatchRecord } from '../data/contracts';
import type { journalStore } from '../data/clientStorage';
export interface Submission extends ReturnType<typeof journalStore.getSnapshot> {
    complete(match: MatchRecord): void;
    retry(id: string): void;
    leaveResult(): void;
    reset(dataset: 'empty' | 'multiple-pages', seed: number): Promise<void>;
}
export const SubmissionContext = createContext<Submission | null>(null);
export function useSubmission() {
    const value = useContext(SubmissionContext);
    if (!value) throw new Error('SubmissionProvider is missing.');
    return value;
}