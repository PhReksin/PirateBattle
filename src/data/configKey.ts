import type { GameConfig } from '../game/config';

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return '{' + Object.keys(object).sort()
      .map((key) => JSON.stringify(key) + ':' + canonicalJson(object[key])).join(',') + '}';
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('Configuration must contain JSON values.');
  return serialized;
}

export async function configurationKey(config: GameConfig): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(config));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}