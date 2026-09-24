import { PanelButton, PanelScene } from './Panel';
import './AssetLoading.css';

interface AssetLoadingProps {
    progress: number;
    error: string | null;
    onRetry: () => void;
    onMenu: () => void;
}

export function AssetLoading({
    progress,
    error,
    onRetry,
    onMenu,
}: AssetLoadingProps) {
    const value = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    const percentage = Math.round(value * 100);
    const failed = error !== null;
    const status = value === 1 ? 'Preparing the arena…' : 'Loading game assets…';
    const rightInset = 100 - ((30 + 196 * value) / 256) * 100;

    return (
        <PanelScene className={'panel-loading' + (failed ? ' panel-loading--error' : '')}
            aria-labelledby="asset-loading-title">
            <h1 id="asset-loading-title">
                {failed ? 'Could not set sail' : 'Setting sail'}
            </h1>
            <p className="loading-intro">
                {failed ? 'Your ship is still in port.' : 'Preparing your ship and the battlefield.'}
            </p>

            <div className="loading-ship" aria-hidden="true">
                <img src="/assets/png/retina/ships/ship_2.png" alt="" width="132" height="226" />
            </div>

            {failed ? (
                <div className="loading-failure">
                    <p className="loading-error" role="alert">
                        The game could not finish loading. Try again or return to the main menu.
                    </p>
                    {error && <details className="loading-details">
                        <summary>Error details</summary>
                        <p>{error}</p>
                    </details>}
                </div>
            ) : (
                <div className="loading-meter">
                    <div className="loading-progress" role="progressbar" aria-label="Game asset loading"
                        aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}
                        aria-valuetext={`${percentage}% — ${status}`}>
                        <img src="/assets/png/retina/ui/hud/health_frame.png" alt="" width="512" height="96" />
                        <img className="loading-progress-fill" src="/assets/png/retina/ui/hud/health_fill_amber.png"
                            alt="" width="512" height="96"
                            style={{ clipPath: `inset(0 ${rightInset}% 0 0)`, opacity: value === 0 ? 0 : 1 }} />
                        <strong>{percentage}%</strong>
                    </div>
                    <p className="loading-status" role="status">{status}</p>
                </div>
            )}

            <div className="panel-actions loading-actions">
                {failed && <PanelButton onClick={onRetry}>Retry</PanelButton>}
                <PanelButton tone={failed ? 'secondary' : 'primary'} onClick={onMenu}>Main Menu</PanelButton>
            </div>
            {!failed && <p className="panel-hint loading-hint">Your battle begins when everything is ready.</p>}
        </PanelScene>
    );
}