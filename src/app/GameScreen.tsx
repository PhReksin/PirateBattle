import { useEffect, useRef, useState } from 'react';
import type { ProfileReport } from '../game/profiler';
import type { GameSession } from '../game/session';
import type { CompletedGame } from './types';
import { configurationKey } from '../data/configKey';
import { PauseDialog } from '../components/PauseDialog';
import type { InputController } from '../game/input';
import { AssetLoading } from '../components/AssetLoading';
import { Hud } from '../components/Hud';
import type { HudSnapshot } from '../components/Hud';
import { TouchControls } from '../components/TouchControls';
import './GameScreen.css';
import type { CSSProperties } from 'react';
import { loadGameAssets, UI_ASSETS } from '../rendering/assets';
import { createRuntime } from '../rendering/createRuntime';
import type { GameRuntime } from '../rendering/createRuntime';
import { mountAsyncRuntime } from '../rendering/lifecycle';

const gameArt = {
    '--round-normal': `url(${UI_ASSETS.round})`,
    '--round-hover': `url(${UI_ASSETS.roundHover})`,
    '--round-pressed': `url(${UI_ASSETS.roundPressed})`,
} as CSSProperties;

interface GameScreenProps { onProfileComplete?: (report: ProfileReport) => void; session: GameSession; onMenu: () => void; onComplete: (completed: CompletedGame) => void }
export function GameScreen({ session, onMenu, onComplete, onProfileComplete }: GameScreenProps) {
    const [attempt, setAttempt] = useState(0);
    return <GameAttempt key={session.matchId + ':' + attempt} session={session}
        onMenu={onMenu} onComplete={onComplete} onProfileComplete={onProfileComplete} onRetry={() => setAttempt((value) => value + 1)} />;
}
function GameAttempt({ session, onMenu, onRetry, onComplete, onProfileComplete }: GameScreenProps & { onRetry: () => void }) {
    const hostRef = useRef<HTMLDivElement>(null);
    const runtimeRef = useRef<GameRuntime | null>(null);
    const [input, setInput] = useState<InputController | null>(null);
    const [hud, setHud] = useState<HudSnapshot | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        let active = true;
        const dispose = mountAsyncRuntime(async () => {
            await loadGameAssets((value) => { if (active) setProgress(value); });
            const comparisonKey = await configurationKey(session.config);
            if (!active) throw new Error('Loading was cancelled.');
            const runtime = await createRuntime({
                host, session,
                onProfileComplete: (report) => { if (active) onProfileComplete?.(report); },
                onHud: (value) => { if (active) setHud(value); },
                onComplete: (result) => { if (active) onComplete({ session, result, configKey: comparisonKey, finishedAt: session.testSetup?.finishedAt ?? new Date().toISOString() }); },
            });
            return {
                start() { runtimeRef.current = runtime; runtime.start(); setInput(runtime.input); setReady(true); },
                destroy() { runtime.destroy(); if (runtimeRef.current === runtime) runtimeRef.current = null; },
            };
        }, (cause) => {
            if (active) setError(cause instanceof Error ? cause.message : 'The game could not be loaded.');
        });
        return () => { active = false; dispose(); };
    }, [session, onComplete, onProfileComplete]);

    return <section className="match-screen" style={gameArt}>
        {ready && hud ? <header className="game-hud">
            <Hud snapshot={hud} />
            <div className="game-actions">
                <button className="game-round-button" aria-label="Pause" title="Pause (P / Escape)"
                    onClick={() => runtimeRef.current?.pause()} disabled={hud.phase !== 'running'}>
                    <img src={UI_ASSETS.pause} alt="" />
                </button>
                <button className="game-round-button" aria-label="Main Menu" title="Main Menu" onClick={onMenu}>
                    <img src={UI_ASSETS.home} alt="" />
                </button>
            </div>
        </header> : <div className="game-loading"><AssetLoading progress={progress} error={error}
            onRetry={onRetry} onMenu={onMenu} /></div>}
        <div ref={hostRef} className="arena-host" data-testid="arena" data-game-input
            tabIndex={0} aria-label="Pirate Battle arena" />
        {ready && input && hud && <TouchControls input={input} disabled={hud.phase !== 'running'} />}
        <PauseDialog open={hud?.phase === 'paused'} onResume={() => runtimeRef.current?.resume()} onMenu={onMenu} />
    </section>;
}