import type { GameConfig } from '../game/config';
export type EndReason = 'time' | 'death';

export interface MatchRecord {
  matchId: string;
  playerId: string;
  playerName: string;
  finishedAt: string;       // UTC ISO timestamp
  score: number;
  activeDurationSeconds: number;
  reason: EndReason;
  config: GameConfig;
  configKey: string;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  revision: number;
}

export interface RankingEntry extends MatchRecord {
  rank: number;
}