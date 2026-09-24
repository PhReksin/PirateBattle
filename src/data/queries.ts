import { useQuery } from '@tanstack/react-query';
import { getRanking, getHistory, isTransientFailure } from './api';
const policy = {
    staleTime: 15_000, gcTime: 300_000, refetchOnMount: 'always' as const, refetchOnWindowFocus: true,
    retry: (count: number, error: unknown) => count < 2 && isTransientFailure(error),
    retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 4000),
};
export function useRanking(configKey: string, page: number, pageSize: number, apiReady: boolean, generation: number) {
    return useQuery({
        ...policy, queryKey: ['ranking', generation, configKey, page, pageSize],
        queryFn: ({ signal }) => getRanking(configKey, page, pageSize, signal), enabled: apiReady && !!configKey
    });
}
export function useHistory(playerId: string, page: number, pageSize: number, apiReady: boolean, generation: number) {
    return useQuery({
        ...policy, queryKey: ['history', generation, playerId, page, pageSize],
        queryFn: ({ signal }) => getHistory(playerId, page, pageSize, signal), enabled: apiReady && !!playerId
    });
}