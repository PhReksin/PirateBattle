import type { ProfileReport } from '../game/profiler';
import type { MatchRecord } from '../data/contracts';
import { PanelButton, PanelScene } from '../components/Panel';
import { formatDuration } from '../components/recordFormatting';

export function Result({ match, profile, status, error, onRetry, onPlayAgain, onMenu }: {
    profile: ProfileReport | null;
    match: MatchRecord; status: 'unsaved' | 'pending' | 'sending' | 'confirmed' | 'failed';
    error: string | null; onRetry: () => void; onPlayAgain: () => void; onMenu: () => void;
}) {
    const labels = {
        unsaved: 'Result has not been saved locally', pending: 'Pending registration',
        sending: 'Sending registration…', confirmed: 'Registration confirmed', failed: 'Registration failed'
    };
    return <PanelScene className="panel-result" data-testid="result" data-match-id={match.matchId} aria-labelledby="result-title">
        <h1 id="result-title">Battle complete</h1>
        <p className="result-score" aria-label={'Score: ' + match.score}>{match.score}</p>
        <p className="result-summary">Points · {formatDuration(match.activeDurationSeconds)} · {match.reason === 'time' ? 'Time up' : 'Defeated'}</p>
        <span className="panel-sr-only">{match.reason === 'time' ? 'Time expired' : 'Your ship was destroyed'}.
            Active time: {match.activeDurationSeconds.toFixed(1)} seconds.</span>
        <div className="panel-actions">
            <PanelButton onClick={onPlayAgain}>Play Again</PanelButton>
            <PanelButton onClick={onMenu}>Main Menu</PanelButton>
        </div>
        <div className="result-registration">
            <p role="status">{labels[status]}</p>
            {error && <p className="panel-error" role="alert">{error}</p>}
            {status !== 'confirmed' && <PanelButton tone="secondary" disabled={status === 'sending'} onClick={onRetry}>
                {status === 'unsaved' ? 'Retry local save' : 'Retry registration'}</PanelButton>}
            {profile && <button className="panel-text-button" onClick={() => {
                const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }));
                const link = document.createElement('a'); link.href = url; link.download = 'performance-' + match.matchId + '.json';
                link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
            }}>Download performance data</button>}
        </div>
    </PanelScene>;
}