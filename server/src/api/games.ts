import type { FastifyInstance } from 'fastify';
import type { DB } from '../db.js';
import { createGame, getGameBySlug, addPlayer, listPlayers, listThrows, countActiveGames, type GameRow, type PlayerRow } from '../repo.js';
import { computeGameState } from '../engine/index.js';
import { groupTurns } from '../engine/turns.js';
import type { PlayerInput, PlayerDart, X01InOut } from '../engine/types.js';

const GAME_TYPES = ['x01', 'cricket', 'aroundTheClock'] as const;
const X01_STARTS = [301, 501, 701];
const X01_IN_OUT: X01InOut[] = ['straight', 'double', 'master'];
const CRICKET_MODES = ['standard', 'cutthroat'];

/** Minimalvalidierung der Spieloptionen, damit die Engine keinen NaN-Müll erzeugt. */
export function validGameConfig(gameType: string, options: unknown): boolean {
  const o = (options ?? {}) as Record<string, unknown>;
  switch (gameType) {
    case 'x01':
      return X01_STARTS.includes(o.start as number) &&
        X01_IN_OUT.includes(o.in as X01InOut) &&
        X01_IN_OUT.includes(o.out as X01InOut);
    case 'cricket':
      return CRICKET_MODES.includes(o.mode as string);
    case 'aroundTheClock':
      return true;
    default:
      return false;
  }
}

export function firstTurnDartsFor(p: PlayerRow): number | undefined {
  return p.catchUp === 'catchUp' && p.joinedAtRound > 0 ? p.joinedAtRound * 3 : undefined;
}

export interface GameView {
  slug: string; gameType: string; options: unknown; status: string;
  createdAt: number; expiresAt: number;
  players: { id: string; name: string; order: number; joinedAtRound: number; catchUp: string }[];
  state: unknown;
  history: { seq: number; playerId: string; segment: number; multiplier: number; round: number; dartNo: number }[];
}

export function buildGameView(db: DB, game: GameRow): GameView {
  const players = listPlayers(db, game.id);
  const history = listThrows(db, game.id);
  const engineIn: PlayerInput[] = players.map((p) => ({ id: p.id, name: p.name, order: p.order, firstTurnDarts: firstTurnDartsFor(p) }));
  const darts: PlayerDart[] = history.map((e) => ({ playerId: e.playerId, segment: e.segment, multiplier: e.multiplier }));
  const result = computeGameState(game.gameType, game.options, engineIn, darts);

  // Runde + Wurfnummer (1–3) je Wurf für die Verlaufsanzeige herleiten.
  const firstTurnDarts = new Map<string, number>();
  for (const p of players) { const f = firstTurnDartsFor(p); if (f) firstTurnDarts.set(p.id, f); }
  const turnMeta: { round: number; dartNo: number }[] = [];
  const roundCount = new Map<string, number>();
  for (const turn of groupTurns(darts, firstTurnDarts)) {
    const round = (roundCount.get(turn.playerId) ?? 0) + 1;
    roundCount.set(turn.playerId, round);
    turn.darts.forEach((_, i) => turnMeta.push({ round, dartNo: i + 1 }));
  }
  const historyView = history.map((e, i) => ({ ...e, round: turnMeta[i]?.round ?? 1, dartNo: turnMeta[i]?.dartNo ?? 1 }));

  return {
    slug: game.slug, gameType: game.gameType, options: game.options, status: game.status,
    createdAt: game.createdAt, expiresAt: game.expiresAt,
    players, state: result.state, history: historyView,
  };
}

export function registerGameRoutes(app: FastifyInstance, db: DB, now: () => number, maxActive: number): void {
  app.post('/api/games', { config: { rateLimit: { max: Number(process.env.CREATE_RATE_MAX ?? 20), timeWindow: '1 hour' } } }, async (req, reply) => {
    const active = countActiveGames(db, now());
    if (active >= maxActive) return reply.code(429).send({ error: 'Serverlimit erreicht' });
    const body = req.body as { gameType: 'x01' | 'cricket' | 'aroundTheClock'; options: unknown; players?: string[] };
    if (!body?.gameType) return reply.code(400).send({ error: 'gameType fehlt' });
    if (!GAME_TYPES.includes(body.gameType)) return reply.code(400).send({ error: 'ungültiger Spieltyp' });
    if (!validGameConfig(body.gameType, body.options)) return reply.code(400).send({ error: 'ungültige Optionen' });
    const game = createGame(db, { gameType: body.gameType, options: body.options ?? {}, now: now() });
    for (const name of body.players ?? []) {
      if (name?.trim()) addPlayer(db, game.id, { name: name.trim().slice(0, 14) });
    }
    return reply.code(201).send({ slug: game.slug });
  });

  app.get('/api/games/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const game = getGameBySlug(db, slug);
    if (!game) return reply.code(404).send({ error: 'nicht gefunden' });
    return reply.send(buildGameView(db, game));
  });
}
