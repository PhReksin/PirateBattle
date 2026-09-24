import { useState, useSyncExternalStore } from 'react';
import { scenarios, SCENARIOS } from '../mocks/scenarios';
import type { Scenario } from '../mocks/scenarios';
export function NetworkScenarios({ onReset }: { onReset: (dataset: 'empty' | 'multiple-pages', seed: number) => Promise<void> }) {
    const selected = useSyncExternalStore(scenarios.subscribe, scenarios.getSelected);
    const [dataset, setDataset] = useState<'empty' | 'multiple-pages'>('multiple-pages');
    const [seed, setSeed] = useState('1337');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function reset() {
        const number = Number(seed);
        if (!seed.trim() || !Number.isInteger(number) || number < 0 || number > 4294967295) {
            setError('Seed must be an integer from 0 to 4294967295.'); return;
        }
        setBusy(true); setError('');
        try { await onReset(dataset, number); }
        catch (cause) { setError(String(cause)); }
        finally { setBusy(false); }
    }
    return <details className="network-panel"><summary>Network scenarios</summary>
        <label>Network behavior <select value={selected} disabled={busy} onChange={(event) => {
            try { scenarios.select(event.target.value as Scenario); setError(''); } catch (cause) { setError(String(cause)); }
        }}>{SCENARIOS.map((scenario) => <option key={scenario} value={scenario}>{scenario}</option>)}</select></label>
        <label>Dataset <select value={dataset} disabled={busy} onChange={(event) => setDataset(event.target.value as typeof dataset)}>
            <option value="multiple-pages">Multiple pages</option><option value="empty">Empty</option>
        </select></label>
        <label>Fixture seed <input value={seed} onChange={(event) => setSeed(event.target.value)} inputMode="numeric" disabled={busy} /></label>
        <p>Reset clears confirmed demo matches, pending registrations and the last result. Your identity and saved game options stay the same. The selected network behavior stays active.</p>
        <button onClick={() => { void reset(); }} disabled={busy}>{busy ? 'Resetting…' : 'Reset demo data'}</button>
        {error && <p role="alert">{error}</p>}
    </details>;
}