import { useId, useSyncExternalStore } from 'react';
import { audioSettings } from '../audio/audio';
import { PanelButton } from './Panel';
import './AudioSettings.css';

export function AudioSettings() {
    const settings = useSyncExternalStore(audioSettings.subscribe, audioSettings.getSnapshot);
    const id = useId();
    return <div className="audio-settings" role="group" aria-label="Sound controls">
        <PanelButton tone="secondary" aria-pressed={settings.muted} aria-label="Mute sound"
            onClick={() => audioSettings.set({ ...settings, muted: !settings.muted })}>
            Sound {settings.muted ? 'Off' : 'On'}
        </PanelButton>
        <label htmlFor={id}>Volume</label>
        <input id={id} type="range" min="0" max="100" step="1" value={Math.round(settings.volume * 100)}
            aria-valuetext={Math.round(settings.volume * 100) + ' percent'}
            onChange={(event) => audioSettings.set({ ...settings, volume: Number(event.target.value) / 100 })} />
    </div>;
}