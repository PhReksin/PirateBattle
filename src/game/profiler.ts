import type { GameConfig } from './config';
export function createProfiler() {
    const intervals: number[] = [];
    const entities: Array<{ activeSeconds: number; enemies: number; projectiles: number; effects: number }> = [];
    let previous: number | undefined;
    let lastSampleSecond = -1;
    return {
        frame(now: number, running: boolean, activeSeconds: number, counts: {
            enemies: number; projectiles: number; effects: number;
        }) {
            if (!running) { previous = undefined; return; }
            if (previous !== undefined) intervals.push(now - previous);
            previous = now;
            const second = Math.floor(activeSeconds);
            if (second !== lastSampleSecond) {
                entities.push({ activeSeconds, ...counts });
                lastSampleSecond = second;
            }
        },
        resetFrameBoundary() { previous = undefined; },
        report() {
            const sorted = [...intervals].sort((a, b) => a - b);
            const elapsed = intervals.reduce((sum, value) => sum + value, 0);
            return {
                averageFps: elapsed > 0 ? intervals.length * 1000 / elapsed : null,
                p95FrameMs: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null,
                frameIntervalsMs: [...intervals],
                entities: [...entities],
            };
        },
    };
}

export interface ProfileReport {
    metrics: ReturnType<ReturnType<typeof createProfiler>['report']>;
    config: GameConfig;
    activeDurationSeconds: number;
    reason: 'time' | 'death';
    fullDurationRun: boolean;
    environment: { userAgent: string; width: number; height: number; devicePixelRatio: number; resolution: number };
}