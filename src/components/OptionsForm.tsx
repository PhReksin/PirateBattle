import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { DEFAULT_OPTIONS, loadOptions, parseOptions, saveOptions } from '../data/options';
import { PanelButton, PanelRoundButton } from './Panel';

interface Props {
    onDone: () => void;
    onCancel: () => void;
    returnLabel: string;
    paused?: boolean;
}

function nextValue(text: string, direction: number, min: number, max: number, step: number, fallback: number) {
    const parsed = Number(text);
    const value = text.trim() && Number.isFinite(parsed) ? parsed : fallback;
    return String(Math.max(min, Math.min(max, Math.round((value + direction * step) / step) * step)));
}

export function OptionsForm({ onDone, onCancel, returnLabel, paused = false }: Props) {
    const [initial] = useState(loadOptions);
    const [session, setSession] = useState(String(initial.sessionSeconds));
    const [spawn, setSpawn] = useState(String(initial.spawnSeconds));
    const [error, setError] = useState('');
    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        try { saveOptions(parseOptions(session, spawn)); onDone(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Settings could not be saved.'); }
    }
    return <form className="options-form" onSubmit={submit} noValidate>
        <div className="option-setting">
            <label htmlFor="session-time">Game session time</label>
            <div className="option-stepper">
                <PanelRoundButton icon="minus" aria-label="Decrease game session time"
                    disabled={session.trim() !== '' && Number(session) <= 60}
                    onClick={() => setSession(nextValue(session, -1, 60, 180, 1, DEFAULT_OPTIONS.sessionSeconds))} />
                <div className="option-value"><input id="session-time" autoFocus={paused} type="number" min="60" max="180" step="1"
                    value={session} onChange={(event) => setSession(event.target.value)}
                    aria-describedby="options-limits options-error" /><span aria-hidden="true">s</span></div>
                <PanelRoundButton icon="plus" aria-label="Increase game session time"
                    disabled={session.trim() !== '' && Number(session) >= 180}
                    onClick={() => setSession(nextValue(session, 1, 60, 180, 1, DEFAULT_OPTIONS.sessionSeconds))} />
            </div>
        </div>
        <div className="option-setting">
            <label htmlFor="spawn-time">Enemy spawn time</label>
            <div className="option-stepper">
                <PanelRoundButton icon="minus" aria-label="Decrease enemy spawn time"
                    disabled={spawn.trim() !== '' && Number(spawn) <= 1}
                    onClick={() => setSpawn(nextValue(spawn, -1, 1, 10, 0.5, DEFAULT_OPTIONS.spawnSeconds))} />
                <div className="option-value"><input id="spawn-time" type="number" min="1" max="10" step="0.5"
                    value={spawn} onChange={(event) => setSpawn(event.target.value)}
                    aria-describedby="options-limits options-error" /><span aria-hidden="true">s</span></div>
                <PanelRoundButton icon="plus" aria-label="Increase enemy spawn time"
                    disabled={spawn.trim() !== '' && Number(spawn) >= 10}
                    onClick={() => setSpawn(nextValue(spawn, 1, 1, 10, 0.5, DEFAULT_OPTIONS.spawnSeconds))} />
            </div>
        </div>
        <p id="options-limits" className="panel-sr-only">Session: 60–180 whole seconds. Spawns: 1–10 seconds, in 0.5-second increments.</p>
        <p id="options-error" className="panel-error" role="alert">{error}</p>
        <div className="panel-actions">
            <PanelButton type="submit">{returnLabel}</PanelButton>
            <p className="panel-hint">{paused ? 'Saves for your next battle. This battle stays paused.' : 'Saves these settings for your next battle.'}</p>
            <button type="button" className="panel-text-button" onClick={onCancel}>Discard changes</button>
        </div>
    </form>;
}