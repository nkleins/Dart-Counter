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
