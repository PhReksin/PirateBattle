import { http, HttpResponse, delay } from 'msw';
import { scenarios } from './scenarios';
import type { RequestPlan } from './scenarios';
import type { MatchRecord } from '../data/contracts';
import { isMatchRecord } from '../data/validation';
import { configurationKey } from '../data/configKey';
import { readSnapshot, insertOrGet, DatabaseConflict } from './database';

const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function pagination(request: Request) {
    const query = new URL(request.url).searchParams;
    const page = Number(query.get('page') ?? 1);
    const pageSize = Number(query.get('pageSize') ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) return null;
    return { query, page, pageSize };
}
function failure(error: unknown) {
    return HttpResponse.json({ message: error instanceof Error ? error.message : 'Data service unavailable.' },
        { status: error instanceof DatabaseConflict ? 409 : 503 });
}
async function applyPlan(plan: RequestPlan) {
    await delay(plan.latency);
    if (plan.networkError) return HttpResponse.error();
    if (plan.status) return HttpResponse.json({ message: 'Simulated network failure (' + plan.status + ').' }, { status: plan.status });
    return null;
}
async function list(request: Request, playerId?: string) {
    const plan = scenarios.plan(request.method, new URL(request.url).pathname);
    const params = pagination(request);
    if (!params) return HttpResponse.json({ message: 'Invalid pagination.' }, { status: 400 });
    const { query, page, pageSize } = params;
    const key = query.get('configKey');
    if (playerId === undefined && (!key || !/^[a-f0-9]{64}$/.test(key))) {
        return HttpResponse.json({ message: 'Invalid configuration key.' }, { status: 400 });
    }
    try {
        const snapshot = await readSnapshot();
        const simulated = await applyPlan(plan);
        if (simulated) return simulated;
        const filtered = snapshot.records.filter((record) => playerId === undefined ? record.configKey === key : record.playerId === playerId);
        filtered.sort(playerId === undefined ? (a, b) => b.score - a.score || lexical(a.finishedAt, b.finishedAt) || lexical(a.matchId, b.matchId) :
            (a, b) => lexical(b.finishedAt, a.finishedAt) || lexical(a.matchId, b.matchId));
        const ranked = filtered.map((record, index) => ({ ...record, rank: index + 1 }));
        return HttpResponse.json({
            items: ranked.slice((page - 1) * pageSize, page * pageSize),
            page, pageSize, total: ranked.length, revision: snapshot.revision
        });
    } catch (error) { return failure(error); }
}
export const handlers = [
    http.get('/api/ranking', ({ request }) => list(request)),
    http.get('/api/players/:playerId/matches', ({ request, params }) => list(request, String(params.playerId))),
    http.post('/api/matches', async ({ request }) => {
        const plan = scenarios.plan(request.method, new URL(request.url).pathname);
        // Capture the database generation before parsing, hashing, or delaying the request.
        const captured = readSnapshot();
        void captured.catch(() => { });
        let body: unknown;
        try { body = await request.json(); }
        catch { return HttpResponse.json({ message: 'Invalid JSON.' }, { status: 400 }); }
        if (!isMatchRecord(body) || request.headers.get('Idempotency-Key') !== body.matchId) {
            return HttpResponse.json({ message: 'Invalid completed match.' }, { status: 422 });
        }
        const match: MatchRecord = body;
        try {
            const snapshot = await captured;
            if (await configurationKey(match.config) !== match.configKey) {
                return HttpResponse.json({ message: 'Configuration key does not match.' }, { status: 422 });
            }
            const simulated = await applyPlan(plan);
            if (simulated) return simulated;
            const result = await insertOrGet(match, snapshot.generation);
            if (plan.timeoutAfterCommit && result.created) await delay(5000);
            return HttpResponse.json(result.record, { status: result.created ? 201 : 200 });
        } catch (error) { return failure(error); }
    }),
];