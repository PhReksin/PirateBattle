import { AudioSettings } from '../components/AudioSettings';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './MainMenu.css';
import { PanelBrand, PanelButton } from '../components/Panel';

interface Props {
    onPlay: () => void;
    onOptions: () => void;
    ranking: ReactNode;
    history: ReactNode;
    networkPanel?: ReactNode;
    statusPanel?: ReactNode;
}

const menuImages = '/assets/png/retina/ui/menu/';
const controlImages = '/assets/png/retina/ui/controls/';

interface ControlInstruction {
    icon: string;
    label: string;
    keys: string;
    keyLabel?: string;
}

const movementControls: ControlInstruction[] = [
    { icon: 'icon_forward', label: 'Forward', keys: 'W / ↑', keyLabel: 'W or Up arrow' },
    { icon: 'icon_turn_left', label: 'Turn left', keys: 'A / ←', keyLabel: 'A or Left arrow' },
    { icon: 'icon_turn_right', label: 'Turn right', keys: 'D / →', keyLabel: 'D or Right arrow' },
];
const firingControls: ControlInstruction[] = [
    { icon: 'icon_fire_front', label: 'Front cannon', keys: 'Space' },
    { icon: 'icon_fire_left', label: 'Left side', keys: 'Q' },
    { icon: 'icon_fire_right', label: 'Right side', keys: 'E' },
];

function ControlGuide({ label, controls }: { label: string; controls: ControlInstruction[] }) {
    return <ul className="pirate-menu__control-guide" aria-label={label}>
        {controls.map((control) => <li key={control.icon}>
            <span className="pirate-menu__control-icon" aria-hidden="true">
                <img src={controlImages + control.icon + '.png'} alt="" />
            </span>
            <span className="pirate-menu__control-copy">
                <span>{control.label}</span>
                <kbd aria-label={control.keyLabel}>{control.keys}</kbd>
            </span>
        </li>)}
    </ul>;
}

export function MainMenu({ onPlay, onOptions, ranking, history, networkPanel }: Props) {
    const [tab, setTab] = useState(0);
    const [recordsOpen, setRecordsOpen] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const openerRef = useRef<HTMLButtonElement | null>(null);
    const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
    const labels = ['Ranking', 'Match History'];

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (recordsOpen) {
            if (!dialog.open) dialog.showModal();
            dialog.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus();
        } else {
            if (dialog.open) dialog.close();
            openerRef.current?.focus();
        }
        return () => { if (dialog.open) dialog.close(); };
    }, [recordsOpen]);

    function openRecords(index: number, button: HTMLButtonElement) {
        openerRef.current = button;
        setTab(index);
        setRecordsOpen(true);
    }

    return (
        <main className="pirate-menu">
            <div className="pirate-menu__hero">
                <section className="pirate-menu__card" aria-labelledby="pirate-menu-title">
                    <h1 id="pirate-menu-title" className="pirate-menu__title">
                        <img src={menuImages + 'title_pirate_battle.png'} alt="Pirate Battle" width="768" height="256" />
                    </h1>
                    <p className="pirate-menu__tagline">Set sail. Take command.</p>
                    <button type="button" className="pirate-menu__button pirate-menu__button--primary pirate-menu__play" onClick={onPlay}>Play</button>
                    <button type="button" className="pirate-menu__button pirate-menu__button--primary pirate-menu__options" onClick={onOptions}>Options</button>
                    <div className="pirate-menu__controls" role="group" aria-label="Game controls">
                        <ControlGuide label="Movement controls" controls={movementControls} />
                        <img className="pirate-menu__ship" src="/assets/png/retina/ships/ship_2.png" alt="" width="132" height="226" />
                        <ControlGuide label="Firing controls" controls={firingControls} />
                    </div>
                    <p className="pirate-menu__description">
                        <span className="pirate-menu__pause-hint">
                            <img src={controlImages + 'icon_pause.png'} alt="" />
                            <kbd>P</kbd> / <kbd>Esc</kbd> to pause
                        </span>
                        <span>Navigate the islands. Survive the battle.</span>
                    </p>
                    <div className="pirate-menu__record-buttons" aria-label="Match records">
                        {labels.map((label, index) => (
                            <button type="button" key={label} className="pirate-menu__button pirate-menu__button--secondary"
                                aria-haspopup="dialog" aria-controls="pirate-records"
                                onClick={(event) => openRecords(index, event.currentTarget)}>{label}</button>
                        ))}
                    </div>
                </section>
                <AudioSettings />
                {/* <div className="pirate-menu__status">{statusPanel}</div> */}
                <img className="pirate-menu__brand" src="/assets/Hiroshi_logo.png" alt="Hiro Project" />
            </div>

            <section className="pirate-menu__utilities" aria-label="Game help and network tools">
                {/* <details><summary>Keyboard controls</summary>
                    <p>W: forward. A/D: turn. Space: front cannon. Q/E: left/right broadside. P or Escape: pause.</p>
                </details> */}
                {networkPanel}
            </section>

            <dialog id="pirate-records" ref={dialogRef} className="panel-frame panel-records panel-dialog"
                aria-labelledby="pirate-records-title"
                onCancel={(event) => { event.preventDefault(); setRecordsOpen(false); }}>
                <h2 id="pirate-records-title">Captain’s log</h2>
                {recordsOpen && <>
                    <div className="record-tabs" role="tablist" aria-label="Match records">
                        {labels.map((label, index) => (
                            <PanelButton key={label} role="tab" id={'records-tab-' + index}
                                tone={tab === index ? 'primary' : 'secondary'}
                                aria-controls={'records-panel-' + index} aria-selected={tab === index}
                                tabIndex={tab === index ? 0 : -1}
                                ref={(node) => { tabsRef.current[index] = node; }}
                                onClick={() => setTab(index)}
                                onKeyDown={(event) => {
                                    let next: number;
                                    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - index;
                                    else if (event.key === 'Home') next = 0;
                                    else if (event.key === 'End') next = 1;
                                    else return;
                                    event.preventDefault();
                                    setTab(next);
                                    tabsRef.current[next]?.focus();
                                }}>{label}</PanelButton>
                        ))}
                    </div>
                    <section className="records-content" role="tabpanel" id={'records-panel-' + tab}
                        aria-labelledby={'records-tab-' + tab} tabIndex={0}>
                        {tab === 0 ? ranking : history}
                    </section>
                    <PanelButton className="record-return" onClick={() => setRecordsOpen(false)}>Main Menu</PanelButton>
                    <PanelBrand />
                </>}
            </dialog>
        </main>
    );
}