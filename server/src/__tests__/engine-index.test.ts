import { describe, it, expect } from 'vitest';
import { computeGameState, currentPlayerId, isFinished } from '../engine/index.js';
import type { PlayerInput, PlayerDart } from '../engine/types.js';

const PLAYERS: PlayerInput[] = [{ id: 'a', name: 'A', order: 0 }, { id: 'b', name: 'B', order: 1 }];

describe('computeGameState', () => {
  it('routet x01', () => {
    const r = computeGameState('x01', { start: 501, in: 'straight', out: 'straight' }, PLAYERS, []);
    expect(r.gameType).toBe('x01');
    expect(currentPlayerId(r)).toBe('a');
    expect(isFinished(r).finished).toBe(false);
  });
  it('routet cricket', () => {
    const r = computeGameState('cricket', { mode: 'standard', bull: true }, PLAYERS, []);
    expect(r.gameType).toBe('cricket');
  });
  it('routet aroundTheClock', () => {
    const darts: PlayerDart[] = [];
    const r = computeGameState('aroundTheClock', { advanceByMultiplier: true }, PLAYERS, darts);
    expect(r.gameType).toBe('aroundTheClock');
    expect(currentPlayerId(r)).toBe('a');
  });
});
