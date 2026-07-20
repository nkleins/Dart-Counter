import type { FastifyInstance } from 'fastify';
import type { DB } from '../db.js';
import {
  getGameBySlug, addPlayer, listPlayers, listThrows, appendThrow, undoLastThrow, setStatus, extendGame, resetGame,
  removePlayer, countGamesExpiringAfter,
} from '../repo.js';
import { computeMatchState } from '../engine/match.js';
import { buildGameView, toEngineInput, validGameConfig, GAME_TYPES } from './games.js';

function computeCurrent(db: DB, gameId: number, gameType: 'x01' | 'cricket' | 'aroundTheClock', options: unknown) {
  const { engineIn, darts } = toEngineInput(listPlayers(db, gameId), listThrows(db, gameId));
  return computeMatchState(gameType, options, engineIn, darts);
}

// Ab dieser Rest-Laufzeit gilt ein Spiel als „monatlich verlängert" (mehr als eine
// Wochen-Verlängerung übrig). Trennt +1 Monat sauber von +1 Tag/+1 Woche.
const LONG_LIVED_MS = 14 * 86_400_000;

export function registerPlayRoutes(app: FastifyInstance, db: DB, onChange: (slug: string) => void, now: () => number = () => Date.now()): void {
  app.post('/api/games/:slug/players', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    const body = req.body as { name?: string; catchUp?: 'catchUp' | 'handicap' };
    if (!body?.name?.trim()) return reply.code(400).send({ error: 'name fehlt' });
    const format = (game.options as { format?: { kind?: string } } | null)?.format;
    if (game.status === 'running' && format && format.kind && format.kind !== 'casual') {
      return reply.code(409).send({ error: 'Im Set-/Match-Modus können keine Spieler*innen nachträglich beitreten.' });
    }
    const result = computeCurrent(db, game.id, game.gameType, game.options);
    const joinedAtRound = game.status === 'running' ? result.leg.state.round : 0;
    const player = addPlayer(db, game.id, { name: body.name.trim().slice(0, 14), joinedAtRound, catchUp: body.catchUp ?? 'handicap' });
    onChange(slug);
    return reply.code(201).send({ player });
  });

  app.delete('/api/games/:slug/players/:playerId', async (req, reply) => {
    const { slug, playerId } = req.params as { slug: string; playerId: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    const players = listPlayers(db, game.id);
    if (!players.some((p) => p.id === playerId)) return reply.code(404).send({ error: 'Spieler*in nicht gefunden' });
    if (players.length <= 1) return reply.code(409).send({ error: 'mindestens ein*e Spieler*in muss bleiben' });

    removePlayer(db, game.id, playerId);
    // Wie beim Undo: Status aus dem neuen Zustand herleiten (Sieg kann sich ändern).
    const after = computeCurrent(db, game.id, game.gameType, game.options);
    setStatus(db, game.id, after.match.finished ? 'finished' : (listThrows(db, game.id).length > 0 ? 'running' : 'lobby'));
    onChange(slug);
    return reply.send(buildGameView(db, getGameBySlug(db, slug)!));
  });

  app.post('/api/games/:slug/throws', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    const before = computeCurrent(db, game.id, game.gameType, game.options);
    if (before.match.finished) return reply.code(409).send({ error: 'Match beendet' });
    const current = before.leg.state.currentPlayerId;
    if (!current) return reply.code(409).send({ error: 'kein aktiver Spieler' });

    const body = req.body as { segment?: number; multiplier?: number };
    const segment = Number(body?.segment);
    const multiplier = Number(body?.multiplier);
    if (!Number.isInteger(segment) || !Number.isInteger(multiplier) || segment < 0 || segment > 25 || multiplier < 0 || multiplier > 3) {
      return reply.code(400).send({ error: 'ungültiger Dart' });
    }
    if (game.status === 'lobby') setStatus(db, game.id, 'running');
    appendThrow(db, game.id, { playerId: current, segment, multiplier });

    const after = computeCurrent(db, game.id, game.gameType, game.options);
    if (after.match.finished) setStatus(db, game.id, 'finished');
    onChange(slug);
    const fresh = getGameBySlug(db, slug)!;
    return reply.send(buildGameView(db, fresh));
  });

  app.post('/api/games/:slug/undo', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    undoLastThrow(db, game.id);
    // Nach Undo ist das Spiel i.d.R. wieder laufend (Sieg zurückgenommen)
    const after = computeCurrent(db, game.id, game.gameType, game.options);
    setStatus(db, game.id, after.match.finished ? 'finished' : (listThrows(db, game.id).length > 0 ? 'running' : 'lobby'));
    onChange(slug);
    const fresh = getGameBySlug(db, slug)!;
    return reply.send(buildGameView(db, fresh));
  });

  app.post('/api/games/:slug/reset', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    const body = (req.body ?? {}) as { gameType?: string; options?: unknown };
    let change: { gameType: 'x01' | 'cricket' | 'aroundTheClock'; options: unknown } | undefined;
    if (body.gameType !== undefined) {
      if (!GAME_TYPES.includes(body.gameType as (typeof GAME_TYPES)[number])) return reply.code(400).send({ error: 'ungültiger Spieltyp' });
      if (!validGameConfig(body.gameType, body.options)) return reply.code(400).send({ error: 'ungültige Optionen' });
      change = { gameType: body.gameType as (typeof GAME_TYPES)[number], options: body.options ?? {} };
    }
    resetGame(db, game.id, change);
    onChange(slug);
    return reply.send(buildGameView(db, getGameBySlug(db, slug)!));
  });

  app.post('/api/games/:slug/extend', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    const body = req.body as { duration?: '1d' | '1w' | '1M' };
    const map: Record<string, number> = { '1d': 86_400_000, '1w': 7 * 86_400_000, '1M': 30 * 86_400_000 };
    const addMs = map[body?.duration ?? ''];
    if (!addMs) return reply.code(400).send({ error: 'ungültige Dauer' });

    // Nur begrenzt viele Spiele dürfen gleichzeitig eine Monats-Laufzeit haben.
    // Ein bereits langlebiges Spiel darf sich weiter verlängern (es kommt keins hinzu).
    if (body.duration === '1M') {
      const alreadyLong = game.expiresAt > now() + LONG_LIVED_MS;
      const maxMonthly = Number(process.env.MAX_MONTHLY_GAMES ?? 5);
      if (!alreadyLong && countGamesExpiringAfter(db, now() + LONG_LIVED_MS) >= maxMonthly) {
        return reply.code(429).send({ error: `Monats-Verlängerung ausgelastet (max. ${maxMonthly} Spiele). Bitte +1 Woche wählen.` });
      }
    }
    extendGame(db, game.id, addMs);
    onChange(slug);
    return reply.send(buildGameView(db, getGameBySlug(db, slug)!));
  });
}
