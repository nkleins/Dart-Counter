import type { Dart, GameType, GameView, PlayerMeta } from './types.js';

const BASE = import.meta.env.VITE_API_URL ?? '';

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    // Ohne Body auch keinen JSON-Content-Type senden – sonst lehnt Fastify den
    // leeren Body mit 400 (FST_ERR_CTP_EMPTY_JSON_BODY) ab (z. B. beim Undo).
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request fehlgeschlagen: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function createGame(input: { gameType: GameType; options: unknown; players: string[] }): Promise<{ slug: string }> {
  return post('/api/games', input);
}
export async function getGame(slug: string): Promise<GameView> {
  const res = await fetch(`${BASE}/api/games/${slug}`);
  if (!res.ok) throw new Error(`Spiel nicht gefunden: ${res.status}`);
  return res.json() as Promise<GameView>;
}
export async function throwDart(slug: string, dart: Dart): Promise<GameView> {
  return post(`/api/games/${slug}/throws`, dart);
}
export async function undo(slug: string): Promise<GameView> {
  return post(`/api/games/${slug}/undo`);
}
export async function joinGame(slug: string, input: { name: string; catchUp: 'catchUp' | 'handicap' }): Promise<{ player: PlayerMeta }> {
  return post(`/api/games/${slug}/players`, input);
}
export async function removePlayer(slug: string, playerId: string): Promise<GameView> {
  const res = await fetch(`${BASE}/api/games/${slug}/players/${playerId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Entfernen fehlgeschlagen: ${res.status}`);
  return res.json() as Promise<GameView>;
}
export async function extendGame(slug: string, duration: '1d' | '1w' | '1M'): Promise<GameView> {
  return post(`/api/games/${slug}/extend`, { duration });
}
export async function resetGame(slug: string, change?: { gameType: GameType; options: unknown }): Promise<GameView> {
  return post(`/api/games/${slug}/reset`, change);
}
