export interface PlayerOptions {
  sessionSeconds: number;
  spawnSeconds: number;
}

const KEY = 'pirate-battle:options:v1';
export const DEFAULT_OPTIONS: PlayerOptions = {
  sessionSeconds: 120,
  spawnSeconds: 3,
};

export function isOptions(value: unknown): value is PlayerOptions {
  if (!value || typeof value !== 'object') return false;
  const object = value as Record<string, unknown>;
  const session = object.sessionSeconds;
  const spawn = object.spawnSeconds;
  return typeof session === 'number' && Number.isInteger(session) &&
    session >= 60 && session <= 180 &&
    typeof spawn === 'number' && Number.isFinite(spawn) &&
    spawn >= 1 && spawn <= 10 && Number.isInteger(spawn * 2);
}

export function parseOptions(session: string, spawn: string): PlayerOptions {
  if (!session.trim() || !spawn.trim()) {
    throw new Error('Both settings are required.');
  }
  const value = { sessionSeconds: Number(session), spawnSeconds: Number(spawn) };
  if (!isOptions(value)) {
    throw new Error(
      'Use 60–180 whole seconds for the session and 1–10 seconds ' +
      'in 0.5-second increments for enemy spawns.',
    );
  }
  return value;
}

export function loadOptions(): PlayerOptions {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (isOptions(value)) return value;
  } catch { /* Missing, blocked, or malformed storage uses defaults. */ }
  return { ...DEFAULT_OPTIONS };
}

export function saveOptions(options: PlayerOptions): void {
  if (!isOptions(options)) throw new Error('Invalid settings.');
  localStorage.setItem(KEY, JSON.stringify(options));
}