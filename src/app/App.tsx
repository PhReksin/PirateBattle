import { Analytics } from '@vercel/analytics/react';
import { mountAudio } from '../audio/audio';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ProfileReport } from '../game/profiler';
import { MainMenu } from '../screens/MainMenu';
import { Options } from '../screens/Options';
import { Result } from '../screens/Result';
import { NetworkScenarios } from '../components/NetworkScenarios';
import { Ranking } from '../components/Ranking';
import { MatchHistory } from '../components/MatchHistory';
import { createSession } from '../game/session';
import type { GameSession } from '../game/session';
import { createConfigSnapshot } from '../game/config';
import { loadOptions } from '../data/options';
import { loadIdentity } from '../data/identity';
import type { MatchRecord } from '../data/contracts';
import { GameScreen } from './GameScreen';
import type { CompletedGame, Screen } from './types';
import { useSubmission } from './submission';
import { dataService } from './dataService';

function GameApp() {
    useEffect(() => mountAudio(), []);
    const submission = useSubmission();
    const { complete, leaveResult } = submission;
    const service = useSyncExternalStore(dataService.subscribe, dataService.getSnapshot);
    const [screen, setScreen] = useState<Screen>(() => submission.journal.showResultOnBoot ? 'result' : 'menu');
    const [session, setSession] = useState<GameSession | null>(null);
    const [match, setMatch] = useState<MatchRecord | null>(() => submission.journal.lastResult);
    const [profile, setProfile] = useState<ProfileReport | null>(null);
    const [startError, setStartError] = useState('');
    const [rankingSource, setRankingSource] = useState('saved');
    const [identity] = useState(() => { try { return loadIdentity(); } catch { return null; } });
    // Returning from Options deliberately refreshes the saved-settings snapshot.
    const [savedConfig, setSavedConfig] = useState(() => createConfigSnapshot(loadOptions()));
    const rankingConfig = rankingSource === 'last' && submission.journal.lastResult ? submission.journal.lastResult.config : savedConfig;
    const menu = useCallback(() => { leaveResult(); setSavedConfig(createConfigSnapshot(loadOptions())); setScreen('menu'); }, [leaveResult]);
    useEffect(() => {
        window.addEventListener('popstate', menu);
        return () => window.removeEventListener('popstate', menu);
    }, [menu]);
    const handleComplete = useCallback((completed: CompletedGame) => {
        const record: MatchRecord = {
            matchId: completed.session.matchId, playerId: completed.session.player.id,
            playerName: completed.session.player.displayName, finishedAt: completed.finishedAt,
            score: completed.result.score, activeDurationSeconds: completed.result.activeDurationSeconds,
            reason: completed.result.reason, config: completed.result.config, configKey: completed.configKey,
        };
        complete(record); setMatch(record); setScreen('result');
    }, [complete]);
    function play() {
        try {
            const next = createSession(); setProfile(null); leaveResult(); setSession(next); setMatch(null); setStartError('');
            history.pushState(null, '', '#game'); setScreen('game');
        } catch (cause) { setStartError(cause instanceof Error ? cause.message : 'Could not prepare the match.'); }
    }
    if (screen === 'options') return <Options onBack={menu} />;
    if (screen === 'game' && session) return <GameScreen key={session.matchId} session={session} onMenu={menu} onComplete={handleComplete} onProfileComplete={setProfile} />;
    if (screen === 'result' && match) {
        const pending = submission.journal.outbox[match.matchId];
        const durable = submission.journal.lastResult?.matchId === match.matchId || !!pending;
        const status = !durable ? 'unsaved' : submission.sending.has(match.matchId) ? 'sending' :
            pending?.lastError ? 'failed' : pending ? 'pending' : 'confirmed';
        return <Result match={match} profile={profile} status={status} error={submission.storageError ?? pending?.lastError ?? null}
            onRetry={() => { if (!durable) complete(match); else submission.retry(match.matchId); }} onPlayAgain={play} onMenu={menu} />;
    }
    return <MainMenu onPlay={play} onOptions={() => setScreen('options')}
        statusPanel={<>
            {startError && <p role="alert">{startError}</p>}
            {submission.storageError && <p role="alert">Local storage: {submission.storageError}. Pending records are preserved; restore storage access before retrying.</p>}
            {service.error && <p role="alert">{service.error} <button onClick={() => { void dataService.start().catch(() => { }); }}>Retry data service</button></p>}
            {Object.keys(submission.journal.outbox).length > 0 && <p role="status">{Object.keys(submission.journal.outbox).length} pending registrations</p>}
            {submission.journal.lastResult && <button onClick={() => { setMatch(submission.journal.lastResult); setScreen('result'); }}>View last result</button>}
        </>}
        networkPanel={<NetworkScenarios onReset={async (dataset, seed) => { await submission.reset(dataset, seed); setMatch(null); }} />}
        ranking={<><label className="record-filter"><span className="panel-sr-only">Ranking configuration</span><select value={rankingSource} onChange={(event) => setRankingSource(event.target.value)}>
            <option value="saved">Saved options</option><option value="last" disabled={!submission.journal.lastResult}>Last result</option>
        </select></label><Ranking key={JSON.stringify(rankingConfig)} config={rankingConfig} playerId={identity?.id} apiReady={service.apiReady} generation={service.generation} /></>}
        history={identity ? <MatchHistory key={identity.id + ':' + service.generation} playerId={identity.id} playerName={identity.displayName} apiReady={service.apiReady} generation={service.generation} /> : <p role="alert">Local player identity is unavailable.</p>} />;
}

export function App(){
    return (
        <>
            <GameApp />
            <Analytics />
        </>
    );
}