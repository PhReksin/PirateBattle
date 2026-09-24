import axios from 'axios';
import type { MatchRecord, PageResult, RankingEntry } from './contracts';

export const api = axios.create({ baseURL: '/api', timeout: 4000 });

export async function getRanking(configKey: string, page: number, pageSize: number, signal: AbortSignal) {
    return (await api.get<PageResult<RankingEntry>>('/ranking', {
        params: { configKey, page, pageSize }, signal,
    })).data;
}
export async function getHistory(playerId: string, page: number, pageSize: number, signal: AbortSignal) {
    return (await api.get<PageResult<MatchRecord>>(
        '/players/' + encodeURIComponent(playerId) + '/matches',
        { params: { page, pageSize }, signal },
    )).data;
}
export async function postMatch(match: MatchRecord) {
    return (await api.post<MatchRecord>('/matches', match, {
        headers: { 'Idempotency-Key': match.matchId },
    })).data;
}
export function isTransientFailure(error: unknown) {
    if (!axios.isAxiosError(error) || axios.isCancel(error)) return false;
    const status = error.response?.status;
    return status === undefined || status === 408 || status === 429 || status >= 500;
}