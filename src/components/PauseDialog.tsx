import { AudioSettings } from './AudioSettings';
import { useEffect, useRef, useState } from 'react';
import { PanelBrand, PanelButton } from './Panel';
import { OptionsForm } from './OptionsForm';

export function PauseDialog({ open, onResume, onMenu }: {
    open: boolean; onResume: () => void; onMenu: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const wasOpen = useRef(false);
    const [view, setView] = useState<'pause' | 'options'>('pause');
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open) { wasOpen.current = true; if (!dialog.open) dialog.showModal(); }
        else if (wasOpen.current) { wasOpen.current = false; dialog.close(); document.querySelector<HTMLElement>('[data-game-input]')?.focus(); }
        return () => { if (dialog.open) dialog.close(); };
    }, [open]);
    function resume() { setView('pause'); onResume(); }
    return <dialog className="panel-frame panel-card panel-dialog pause-panel" ref={ref} aria-labelledby="pause-title"
        onCancel={(event) => { event.preventDefault(); if (view === 'options') setView('pause'); else resume(); }}>
        {view === 'pause' ? <>
            <h2 id="pause-title">Paused</h2>
            <p className="pause-description">Ready when you are.</p>
            <div className="panel-actions">
                <PanelButton autoFocus onClick={resume}>Resume</PanelButton>
                {/* <PanelButton onClick={() => setView('options')}>Options</PanelButton> */}
                <PanelButton onClick={onMenu}>Main Menu</PanelButton>
            </div>
            <AudioSettings />
        </> : <>
            <h2 id="pause-title">Options</h2>
            <OptionsForm paused returnLabel="Back to Pause" onDone={() => setView('pause')} onCancel={() => setView('pause')} />
        </>}
        <PanelBrand />
    </dialog>;
}