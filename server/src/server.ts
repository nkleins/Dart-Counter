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
