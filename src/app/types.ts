import type { GameSession } from '../game/session';
import type { GameResult } from '../game/types';
export type Screen = 'menu' | 'options' | 'loading' | 'game' | 'result';
export interface CompletedGame { configKey : string; session: GameSession; result: GameResult; finishedAt: string }