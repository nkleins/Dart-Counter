import Fastify, { type FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import type { DB } from './db.js';
import { registerGameRoutes, buildGameView } from './api/games.js';
import { registerPlayRoutes } from './api/play.js';
import { getGameBySlug } from './repo.js';
import { Rooms } from './realtime.js';

export function buildApp(
  db: DB,
  now: () => number = () => Date.now(),
  opts: { staticDir?: string } = {},
): FastifyInstance {
  const app = Fastify({ logger: false });
  const rooms = new Rooms();

  const maxActive = Number(process.env.MAX_ACTIVE_GAMES ?? 10_000);
  // Nur als Plugin registrieren; das Limit setzt die POST-/api/games-Route selbst.
  app.register(rateLimit, { global: false });

  const onChange = (slug: string): void => {
    const game = getGameBySlug(db, slug);
    if (!game) return;
    rooms.broadcast(slug, JSON.stringify(buildGameView(db, game)));
  };

  app.register(async (scoped) => {
    await scoped.register(websocket);
    scoped.get('/api/games/:slug/ws', { websocket: true }, (socket, req) => {
      const { slug } = req.params as { slug: string };
      const game = getGameBySlug(db, slug);
      if (!game) { socket.close(); return; }
      const leave = rooms.join(slug, (data) => { try { socket.send(data); } catch { /* geschlossen */ } });
      try { socket.send(JSON.stringify(buildGameView(db, game))); } catch { /* Client bereits weg */ } // initialer Resync
      socket.on('close', leave);
    });
  });

  registerGameRoutes(app, db, now, maxActive);
  registerPlayRoutes(app, db, onChange);

  if (opts.staticDir) {
    app.register(fastifyStatic, { root: opts.staticDir, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'nicht gefunden' });
    });
  }

  return app;
}
