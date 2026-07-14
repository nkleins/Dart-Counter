# Docker / Verpackung (ein Container) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die App als **ein einziger Docker-Container** deploybar machen: der Fastify-Server
liefert zusätzlich die gebauten Frontend-Dateien aus (SPA-Fallback für Client-Routen wie
`/g/:slug`), plus `Dockerfile`, `.dockerignore` und `docker-compose.yml`.

**Architecture:** Multi-Stage-Build: Frontend bauen → Server bauen → Prod-Dependencies →
schlankes Runtime-Image. Zur Laufzeit serviert der Server `/api/*` (JSON + WebSocket) und
alles andere aus `web-dist/` (statische Dateien; unbekannte GET-Pfade → `index.html`).

**Tech Stack:** wie Plan 3, plus `@fastify/static`, Docker (node:20-slim Basis).

**Voraussetzung:** Plan 3 + 4 umgesetzt (Server + gebautes Frontend vorhanden).

## Global Constraints

- Ein Container; SQLite-Datei auf einem Volume unter `/data`.
- ENV: `PORT` (Default 3000), `DB_PATH` (Default `/data/dart.sqlite`), `STATIC_DIR`
  (Pfad zu den Frontend-Dateien; im Container `/app/web-dist`).
- `/api/*` hat Vorrang; alle übrigen GET-Pfade liefern `index.html` (SPA).
- Commits: nur Meilensteine, Autor nur User.

---

## File Structure

```
server/
  package.json          # + @fastify/static
  src/app.ts            # optional statisches Ausliefern + SPA-Fallback
  src/server.ts         # STATIC_DIR + DB-Verzeichnis anlegen
Dockerfile              # NEU (Repo-Wurzel)
.dockerignore           # NEU
docker-compose.yml      # NEU
```

---

### Task 1: Server liefert das Frontend aus (SPA-Fallback)

**Files:**
- Modify: `server/package.json`, `server/src/app.ts`
- Test: `server/src/__tests__/static.test.ts`

**Interfaces:**
- `buildApp(db, now?, opts?: { staticDir?: string })` — bei gesetztem `staticDir` werden
  statische Dateien serviert; unbekannte Nicht-`/api`-GET-Pfade liefern `index.html`.

- [ ] **Step 1: Dependency ergänzen**

`server/package.json` — in `dependencies` aufnehmen:
```json
    "@fastify/static": "^7.0.0",
```
Run: `cd server && npm install`
Expected: Installation ohne Fehler.

- [ ] **Step 2: Failing test schreiben**

`server/src/__tests__/static.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../db.js';
import { buildApp } from '../app.js';

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'dc-static-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Dart Counter</title>');
});
afterAll(() => { rmSync(dir, { recursive: true, force: true }); });

describe('Statisches Frontend + SPA-Fallback', () => {
  it('GET / liefert index.html', async () => {
    const app = buildApp(openDb(':memory:'), () => Date.now(), { staticDir: dir });
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Dart Counter');
    await app.close();
  });
  it('GET /g/abc (Client-Route) liefert index.html', async () => {
    const app = buildApp(openDb(':memory:'), () => Date.now(), { staticDir: dir });
    const res = await app.inject({ method: 'GET', url: '/g/abc' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Dart Counter');
    await app.close();
  });
  it('unbekannte /api-Route bleibt 404 JSON', async () => {
    const app = buildApp(openDb(':memory:'), () => Date.now(), { staticDir: dir });
    const res = await app.inject({ method: 'GET', url: '/api/games/unknown' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
```

- [ ] **Step 3: Test laufen lassen — muss fehlschlagen**

Run: `cd server && npx vitest run src/__tests__/static.test.ts`
Expected: FAIL — `buildApp` akzeptiert kein `staticDir` / liefert kein `index.html`.

- [ ] **Step 4: `app.ts` erweitern**

`server/src/app.ts` ersetzen durch (baut auf der Plan-3-Version auf und ergänzt den
statischen Teil):
```ts
import Fastify, { type FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import type { DB } from './db.js';
import { registerGameRoutes, buildGameView } from './api/games.js';
import { registerPlayRoutes } from './api/play.js';
import { getGameBySlug } from './repo.js';
import { Rooms } from './realtime.js';

export function buildApp(db: DB, now: () => number = () => Date.now(), opts: { staticDir?: string } = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const rooms = new Rooms();
  const maxActive = Number(process.env.MAX_ACTIVE_GAMES ?? 10_000);

  const onChange = (slug: string): void => {
    const game = getGameBySlug(db, slug);
    if (!game) return;
    rooms.broadcast(slug, JSON.stringify(buildGameView(db, game)));
  };

  app.register(rateLimit, { global: false });

  app.register(async (scoped) => {
    await scoped.register(websocket);
    scoped.get('/api/games/:slug/ws', { websocket: true }, (socket, req) => {
      const { slug } = req.params as { slug: string };
      const game = getGameBySlug(db, slug);
      if (!game) { socket.close(); return; }
      const leave = rooms.join(slug, (data) => { try { socket.send(data); } catch { /* geschlossen */ } });
      socket.send(JSON.stringify(buildGameView(db, game)));
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
```
*(Hinweis: Der SPA-`setNotFoundHandler` wird nur registriert, wenn `staticDir` gesetzt
ist — die reinen API-Tests aus Plan 3 laufen unverändert weiter, weil sie ohne
`staticDir` gebaut werden und dort der Standard-404 greift.)*

- [ ] **Step 5: Tests + Typecheck**

Run: `cd server && npx vitest run && npx tsc --noEmit`
Expected: PASS (static-Tests + alle bisherigen), kein Typfehler.

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/src/app.ts server/src/__tests__/static.test.ts
git commit -m "Backend: Frontend statisch ausliefern + SPA-Fallback"
```

---

### Task 2: Dockerfile, .dockerignore, docker-compose + Server-Einstieg

**Files:**
- Modify: `server/src/server.ts`
- Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`

**Interfaces:** keine Code-Schnittstellen; Ergebnis ist ein baubares Image.

- [ ] **Step 1: `server.ts` finalisieren (STATIC_DIR + DB-Verzeichnis)**

`server/src/server.ts` ersetzen durch:
```ts
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { openDb } from './db.js';
import { buildApp } from './app.js';
import { startCleanup } from './cleanup.js';

const dbPath = process.env.DB_PATH ?? './data/dart.sqlite';
mkdirSync(dirname(dbPath), { recursive: true });

const db = openDb(dbPath);
const app = buildApp(db, () => Date.now(), { staticDir: process.env.STATIC_DIR });
startCleanup(db);

const port = Number(process.env.PORT ?? 3000);
app.listen({ port, host: '0.0.0.0' })
  .then(() => console.log(`Dart-Counter auf :${port}`))
  .catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: `Dockerfile` anlegen (Repo-Wurzel)**

`Dockerfile`:
```dockerfile
# 1) Frontend bauen
FROM node:20-slim AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# 2) Server bauen (inkl. dev-Deps für tsc)
FROM node:20-slim AS build
WORKDIR /server
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# 3) Nur Produktions-Dependencies (better-sqlite3 nativ kompiliert)
FROM node:20-slim AS deps
WORKDIR /server
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
RUN npm ci --omit=dev

# 4) Runtime
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production STATIC_DIR=/app/web-dist DB_PATH=/data/dart.sqlite PORT=3000
COPY --from=deps /server/node_modules ./node_modules
COPY --from=build /server/dist ./dist
COPY --from=web /web/dist ./web-dist
COPY server/package.json ./package.json
RUN mkdir -p /data
VOLUME /data
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

- [ ] **Step 3: `.dockerignore` anlegen (Repo-Wurzel)**

`.dockerignore`:
```
**/node_modules
**/dist
.git
.superpowers
docs
*.sqlite
*.sqlite3
data
```

- [ ] **Step 4: `docker-compose.yml` anlegen (Repo-Wurzel)**

`docker-compose.yml`:
```yaml
services:
  dart-counter:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - dartdata:/data
    restart: unless-stopped
volumes:
  dartdata:
```

- [ ] **Step 5: Image bauen + Smoke-Test (manuell)**

Run: `docker build -t dart-counter .`
Expected: Build läuft durch alle Stufen ohne Fehler.

Run: `docker run --rm -d -p 3000:3000 --name dc dart-counter && sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ && echo && curl -s -X POST http://localhost:3000/api/games -H 'content-type: application/json' -d '{"gameType":"x01","options":{"start":501,"in":"straight","out":"double"},"players":["A","B"]}' ; docker stop dc`
Expected: `200` für `/` (index.html) und ein JSON `{"slug":"…"}` für die Spiel-Erstellung.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore docker-compose.yml server/src/server.ts
git commit -m "Docker: Ein-Container-Image (Server + Frontend) + compose"
```

---

## Self-Review

**Spec-Abdeckung (Design-Doc §3):**
- Ein Docker-Container ✓ (Task 2)
- Server liefert Frontend + API + WebSocket aus einem Prozess ✓ (Task 1)
- SQLite auf Volume `/data` ✓ (Task 2)
- SPA-Routen (`/g/:slug`) funktionieren bei direktem Aufruf ✓ (Task 1)

**Placeholder-Scan:** kein TBD/TODO. Der Docker-Smoke-Test (Task 2, Step 5) ist ein
manueller Schritt (Docker-Umgebung nötig); Unit-Tests decken die Server-Logik ab. ✓

**Typ-Konsistenz:** `buildApp`-Signatur um optionales `opts.staticDir` erweitert —
additiv, alle bestehenden Aufrufe (Plan 3-Tests) bleiben gültig. ✓
```
