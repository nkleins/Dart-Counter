import { describe, it, expect } from 'vitest';
import { openDb } from '../db.js';
import { buildApp } from '../app.js';

async function newGame(app: ReturnType<typeof buildApp>) {
  const res = await app.inject({
    method: 'POST', url: '/api/games',
    payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'straight' }, players: ['Mia', 'Ben'] },
  });
  return res.json().slug as string;
}

describe('API: Spielen', () => {
  it('Wurf geht an den aktuellen Spieler und zieht Punkte ab', async () => {
    const app = buildApp(openDb(':memory:'));
    const slug = await newGame(app);
    const res = await app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment: 20, multiplier: 3 } });
    expect(res.statusCode).toBe(200);
    const view = res.json();
    const mia = view.players[0];
    expect(view.state.players.find((p: { playerId: string }) => p.playerId === mia.id).remaining).toBe(501 - 60);
    expect(view.status).toBe('running');
    await app.close();
  });

  it('Undo nimmt den letzten Wurf zurück', async () => {
    const app = buildApp(openDb(':memory:'));
    const slug = await newGame(app);
    await app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment: 20, multiplier: 3 } });
    const res = await app.inject({ method: 'POST', url: `/api/games/${slug}/undo` });
    const view = res.json();
    expect(view.state.players[0].remaining).toBe(501);
    await app.close();
  });

  it('Beitreten während running vermerkt Runde + catchUp', async () => {
    const app = buildApp(openDb(':memory:'));
    const slug = await newGame(app);
    await app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment: 1, multiplier: 1 } });
    const res = await app.inject({ method: 'POST', url: `/api/games/${slug}/players`, payload: { name: 'Lena', catchUp: 'catchUp' } });
    expect(res.statusCode).toBe(201);
    expect(res.json().player.catchUp).toBe('catchUp');
    await app.close();
  });

  it('Aufhol-Beitritt in Runde 2 gibt der Person 6 Darts im ersten Zug', async () => {
    const app = buildApp(openDb(':memory:'));
    // 2 Spieler, eine volle Runde spielen (je 3 Darts) -> Runde 2
    const create = await app.inject({
      method: 'POST', url: '/api/games',
      payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'straight' }, players: ['Mia', 'Ben'] },
    });
    const slug = create.json().slug;
    const throwN = (seg: number) => app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment: seg, multiplier: 1 } });
    for (let i = 0; i < 6; i++) await throwN(1); // Mia 3 + Ben 3 -> Runde 2, Mia dran
    // Lena tritt auf (Runde 2) mit Aufholen
    const join = await app.inject({ method: 'POST', url: `/api/games/${slug}/players`, payload: { name: 'Lena', catchUp: 'catchUp' } });
    expect(join.statusCode).toBe(201);
    expect(join.json().player.joinedAtRound).toBe(2);
    const lenaId = join.json().player.id as string;

    // Lena wird an ihrer order_idx-Position in die Rotation eingereiht: nach Bens
    // gerade abgeschlossenem Zug ist direkt sie dran (nicht erst nach einem weiteren
    // Mia+Ben-Zyklus). Sie darf 6 Darts werfen (joinedAtRound 2 * 3): nach 5 Darts
    // muss sie noch am Zug sein.
    let view;
    for (let i = 0; i < 5; i++) view = (await throwN(5)).json();
    expect(view.state.currentPlayerId).toBe(lenaId); // nach 5/6 Darts noch dran
    await app.close();
  });

  it('begrenzt die Monats-Verlängerung auf MAX_MONTHLY_GAMES', async () => {
    const prev = process.env.MAX_MONTHLY_GAMES;
    process.env.MAX_MONTHLY_GAMES = '2';
    try {
      const now = () => 1_700_000_000_000;
      const app = buildApp(openDb(':memory:'), now);
      const mkSlug = async () => (await app.inject({
        method: 'POST', url: '/api/games',
        payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'straight' }, players: ['A'] },
      })).json().slug as string;
      const extend = (slug: string, duration: string) =>
        app.inject({ method: 'POST', url: `/api/games/${slug}/extend`, payload: { duration } });

      const a = await mkSlug();
      const b = await mkSlug();
      const c = await mkSlug();
      expect((await extend(a, '1M')).statusCode).toBe(200);
      expect((await extend(b, '1M')).statusCode).toBe(200);
      // Limit (2) erreicht -> drittes Monats-Spiel abgelehnt
      expect((await extend(c, '1M')).statusCode).toBe(429);
      // +1 Woche bleibt erlaubt und zählt nicht als langlebig
      expect((await extend(c, '1w')).statusCode).toBe(200);
      // bereits langlebiges Spiel darf sich weiter verlängern
      expect((await extend(a, '1M')).statusCode).toBe(200);
      await app.close();
    } finally {
      if (prev === undefined) delete process.env.MAX_MONTHLY_GAMES; else process.env.MAX_MONTHLY_GAMES = prev;
    }
  });

  it('Entfernen einer Person löscht sie inkl. ihrer Würfe und rechnet neu', async () => {
    const app = buildApp(openDb(':memory:'));
    const slug = await newGame(app); // Mia, Ben
    const before = await app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment: 20, multiplier: 3 } });
    const mia = before.json().players[0];
    const ben = before.json().players[1];

    const res = await app.inject({ method: 'DELETE', url: `/api/games/${slug}/players/${mia.id}` });
    expect(res.statusCode).toBe(200);
    const view = res.json();
    expect(view.players).toHaveLength(1);
    expect(view.players[0].id).toBe(ben.id);
    expect(view.history).toHaveLength(0); // Mias Wurf ist weg
    expect(view.state.currentPlayerId).toBe(ben.id);
    await app.close();
  });

  it('letzte verbleibende Person kann nicht entfernt werden -> 409', async () => {
    const app = buildApp(openDb(':memory:'));
    const create = await app.inject({
      method: 'POST', url: '/api/games',
      payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'straight' }, players: ['Solo'] },
    });
    const slug = create.json().slug;
    const only = (await app.inject({ method: 'GET', url: `/api/games/${slug}` })).json().players[0];
    const res = await app.inject({ method: 'DELETE', url: `/api/games/${slug}/players/${only.id}` });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it('Entfernen unbekannter Person -> 404', async () => {
    const app = buildApp(openDb(':memory:'));
    const slug = await newGame(app);
    const res = await app.inject({ method: 'DELETE', url: `/api/games/${slug}/players/gibtsnicht` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('Werfen im beendeten Spiel -> 409', async () => {
    const app = buildApp(openDb(':memory:'));
    const create = await app.inject({
      method: 'POST', url: '/api/games',
      payload: { gameType: 'x01', options: { start: 301, in: 'straight', out: 'straight' }, players: ['Mia'] },
    });
    const slug = create.json().slug;
    const throwOne = (segment: number, multiplier: number) =>
      app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment, multiplier } });
    // 301 = 5 * T20 (60) + 1 -> letzter Wurf gewinnt (straight out)
    for (let i = 0; i < 5; i++) await throwOne(20, 3);
    await throwOne(1, 1); // gewinnt
    const res = await throwOne(1, 1);
    expect(res.statusCode).toBe(409);
    await app.close();
  });
});
