import { UI_ASSETS } from '../rendering/assets';

export interface HudSnapshot {
    hp: number;
    maxHp: number;
    score: number;
    remainingSeconds: number;
    phase: string;
}

export function Hud({ snapshot }: { snapshot: HudSnapshot }) {
    const fraction = Math.max(0, Math.min(1, snapshot.hp / snapshot.maxHp));
    const seconds = Math.max(0, Math.ceil(snapshot.remainingSeconds));
    const time = Math.floor(seconds / 60).toString().padStart(2, '0') + ':' +
        (seconds % 60).toString().padStart(2, '0');
    const fill = fraction <= 0.3 ? UI_ASSETS.healthRed :
        fraction <= 0.65 ? UI_ASSETS.healthAmber : UI_ASSETS.healthGreen;
    const rightInset = 100 - (30 + 196 * fraction) / 256 * 100;
    return <div className="hud">
        <div className="game-health" role="meter" aria-label="Health"
            aria-valuemin={0} aria-valuemax={snapshot.maxHp} aria-valuenow={snapshot.hp}>
            <img className="game-heart" src={UI_ASSETS.heart} alt="" />
            <div className="game-health-bar">
                <img src={UI_ASSETS.healthFrame} alt="" />
                <img className="game-health-fill" src={fill} alt=""
                    style={{ clipPath: `inset(0 ${rightInset}% 0 0)` }} />
                <strong>{snapshot.hp} / {snapshot.maxHp}</strong>
            </div>
        </div>
        <div className="game-counters">
            <div className="game-counter" style={{ backgroundImage: `url(${UI_ASSETS.counter})` }}>
                <img src={UI_ASSETS.score} alt="" />
                <output aria-label="Score" aria-live="off">{snapshot.score}</output>
            </div>
            <div className="game-counter" style={{ backgroundImage: `url(${UI_ASSETS.counter})` }}>
                <img src={UI_ASSETS.time} alt="" />
                <output aria-label="Time remaining" aria-live="off">{time}</output>
            </div>
        </div>
        <span className="game-sr-only" role="status" aria-live="polite">{snapshot.phase}</span>
    </div>;
}