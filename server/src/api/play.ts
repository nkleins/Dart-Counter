import type { FastifyInstance } from 'fastify';
import type { DB } from '../db.js';
import {
  getGameBySlug, addPlayer, listPlayers, listThrows, appendThrow, undoLastThrow, setStatus, extendGame,
} from '../repo.js';
import { computeGameState } from '../engine/index.js';
import type { PlayerInput, PlayerDart } from '../engine/types.js';
import { buildGameView, firstTurnDartsFor } from './games.js';

function computeCurrent(db: DB, gameId: number, gameType: 'x01' | 'cricket' | 'aroundTheClock', options: unknown) {
  const players = listPlayers(db, gameId);
  const engineIn: PlayerInput[] = players.map((p) => ({ id: p.id, name: p.name, order: p.order, firstTurnDarts: firstTurnDartsFor(p) }));
  const darts: PlayerDart[] = listThrows(db, gameId).map((e) => ({ playerId: e.playerId, segment: e.segment, multiplier: e.multiplier }));
  return computeGameState(gameType, options, engineIn, darts);
}

export function registerPlayRoutes(app: FastifyInstance, db: DB, onChange: (slug: string) => void): void {
  app.post('/api/games/:slug/players', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    const body = req.body as { name?: string; catchUp?: 'catchUp' | 'handicap' };
    if (!body?.name?.trim()) return reply.code(400).send({ error: 'name fehlt' });
    const result = computeCurrent(db, game.id, game.gameType, game.options);
    const joinedAtRound = game.status === 'running' ? result.state.round : 0;
    const player = addPlayer(db, game.id, { name: body.name.trim().slice(0, 14), joinedAtRound, catchUp: body.catchUp ?? 'handicap' });
    onChange(slug);
    return reply.code(201).send({ player });
  });

  app.post('/api/games/:slug/throws', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    const before = computeCurrent(db, game.id, game.gameType, game.options);
    if (before.state.finished) return reply.code(409).send({ error: 'Spiel beendet' });
    const current = before.state.currentPlayerId;
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
    if (after.state.finished) setStatus(db, game.id, 'finished');
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
    setStatus(db, game.id, after.state.finished ? 'finished' : (listThrows(db, game.id).length > 0 ? 'running' : 'lobby'));
    onChange(slug);
    const fresh = getGameBySlug(db, slug)!;
    return reply.send(buildGameView(db, fresh));
  });

  app.post('/api/games/:slug/extend', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    const body = req.body as { duration?: '1d' | '1w' | '1M' };
    const map: Record<string, number> = { '1d': 86_400_000, '1w': 7 * 86_400_000, '1M': 30 * 86_400_000 };
    const addMs = map[body?.duration ?? ''];
    if (!addMs) return reply.code(400).send({ error: 'ungültige Dauer' });
    extendGame(db, game.id, addMs);
    onChange(slug);
    return reply.send(buildGameView(db, getGameBySlug(db, slug)!));
  });
}
