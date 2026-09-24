export const SCENARIOS = ['success', 'slow', 'variable', 'out-of-order', 'timeout', 'connection',
    'http-422', 'http-503', 'ranking-error', 'history-error', 'commit-timeout', 'unavailable'] as const;
const STORAGE_KEY = 'pirate-battle:scenario:v1';
function restored(): Scenario {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        if (value && typeof value === 'object' && 'version' in value && value.version === 1 &&
            'selected' in value && SCENARIOS.some((entry) => entry === value.selected)) return value.selected as Scenario;
    } catch { /* Invalid optional behavior settings fall back to success. */ }
    return 'success';
}
export type Scenario =
    | 'success' | 'slow' | 'variable' | 'out-of-order'
    | 'timeout' | 'connection' | 'http-422' | 'http-503'
    | 'ranking-error' | 'history-error' | 'commit-timeout' | 'unavailable';

export interface RequestPlan {
    latency: number;
    status: number | null;
    networkError: boolean;
    timeoutAfterCommit: boolean;
}

export function createScenarioController() {
    let selected: Scenario = restored();
    const listeners = new Set<() => void>();
    const counts = new Map<string, number>();
    return {
        getSelected: () => selected,
        subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        select(scenario: Scenario) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, selected: scenario }));
            selected = scenario; counts.clear(); for (const listener of listeners) listener();
        },
        resetCounters() { counts.clear(); },
        plan(method: string, pathname: string): RequestPlan {
            const key = method + ' ' + pathname;
            const count = counts.get(key) ?? 0;
            counts.set(key, count + 1);
            const plan: RequestPlan = {
                latency: 100, status: null, networkError: false, timeoutAfterCommit: false,
            };
            if (selected === 'slow') plan.latency = 1500;
            if (selected === 'variable') plan.latency = [80, 900, 250][count % 3];
            if (selected === 'out-of-order' && method === 'GET') plan.latency = count === 0 ? 1800 : 100;
            if (selected === 'timeout') plan.latency = 5000;
            if (selected === 'connection') plan.networkError = true;
            if (selected === 'http-422') plan.status = 422;
            if (selected === 'http-503') plan.status = 503;
            if (selected === 'ranking-error' && method === 'GET' && pathname === '/api/ranking') plan.status = 503;
            if (selected === 'history-error' && method === 'GET' && pathname.endsWith('/matches')) plan.status = 503;
            if (selected === 'unavailable' && method === 'POST') plan.status = 503;
            if (selected === 'commit-timeout' && method === 'POST') plan.timeoutAfterCommit = true;
            return plan;
        },
    };
}

export const scenarios = createScenarioController();