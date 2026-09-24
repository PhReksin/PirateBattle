export interface PlayerIdentity { id: string; displayName: string }
const KEY = 'pirate-battle:identity:v1';
let memory: PlayerIdentity | undefined;

export function loadIdentity(): PlayerIdentity {
  if (memory) return memory;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (value && typeof value === 'object' &&
        'id' in value && typeof value.id === 'string' && value.id &&
        'displayName' in value && typeof value.displayName === 'string') {
      return (memory = { id: value.id, displayName: value.displayName });
    }
  } catch { /* Fall through to a new local identity. */ }
  memory = { id: crypto.randomUUID(), displayName: 'Local Captain' };
  localStorage.setItem(KEY, JSON.stringify(memory));
  return memory;
}