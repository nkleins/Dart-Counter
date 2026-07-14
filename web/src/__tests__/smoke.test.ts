import { describe, it, expect } from 'vitest';
import type { GameView } from '../types.js';

describe('types', () => {
  it('GameView-Form ist importierbar', () => {
    const v: GameView = {
      slug: 'x', gameType: 'x01', options: {}, status: 'lobby', createdAt: 0, expiresAt: 0,
      players: [], state: { currentPlayerId: null, round: 1, dartsThrownThisTurn: 0, finished: false, winnerId: null, players: [] } as never,
      history: [],
    };
    expect(v.slug).toBe('x');
  });
});
