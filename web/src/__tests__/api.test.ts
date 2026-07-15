import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGame, throwDart, undo } from '../api.js';

beforeEach(() => { vi.restoreAllMocks(); });

describe('api', () => {
  it('createGame POSTet den korrekten Payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ slug: 'abc' }) });
    vi.stubGlobal('fetch', fetchMock);
    const res = await createGame({ gameType: 'x01', options: { start: 501 }, players: ['A', 'B'] });
    expect(res.slug).toBe('abc');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/games');
    expect(JSON.parse(init.body)).toEqual({ gameType: 'x01', options: { start: 501 }, players: ['A', 'B'] });
  });

  it('throwDart ruft den throws-Endpunkt', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ slug: 's' }) });
    vi.stubGlobal('fetch', fetchMock);
    await throwDart('s', { segment: 20, multiplier: 3 });
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/games/s/throws');
  });

  it('undo sendet keinen JSON-Content-Type ohne Body (sonst 400 bei Fastify)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ slug: 's' }) });
    vi.stubGlobal('fetch', fetchMock);
    await undo('s');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/games/s/undo');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(init.headers).toBeUndefined();
  });

  it('wirft bei !ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: 'x' }) }));
    await expect(throwDart('s', { segment: 1, multiplier: 1 })).rejects.toThrow();
  });
});
