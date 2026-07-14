import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CricketBoard } from '../components/boards/CricketBoard.js';
import type { CricketState, PlayerMeta } from '../types.js';

const players: PlayerMeta[] = [
  { id: 'a', name: 'Mia', order: 0, joinedAtRound: 0, catchUp: 'handicap' },
  { id: 'b', name: 'Ben', order: 1, joinedAtRound: 0, catchUp: 'handicap' },
];
const state: CricketState = {
  currentPlayerId: 'a', round: 1, dartsThrownThisTurn: 0, finished: false, winnerId: null,
  targets: [20, 19, 18, 17, 16, 15, 25], deadTargets: [18],
  players: [
    { playerId: 'a', marks: { 20: 3, 18: 3 }, score: 0, closedAll: false },
    { playerId: 'b', marks: { 18: 3 }, score: 0, closedAll: false },
  ],
};

describe('CricketBoard', () => {
  it('markiert tote Zahl (18) mit Rot-Kennzeichnung', () => {
    render(<CricketBoard state={state} players={players} onThrow={vi.fn()} />);
    const dead = screen.getByTestId('numlabel-18');
    expect(dead.getAttribute('data-dead')).toBe('true');
  });
  it('Tap auf Ziel 20 in aktiver Spalte feuert {20,1} (Single-Default)', async () => {
    const onThrow = vi.fn();
    render(<CricketBoard state={state} players={players} onThrow={onThrow} />);
    await userEvent.click(screen.getByTestId('cell-a-20'));
    expect(onThrow).toHaveBeenCalledWith({ segment: 20, multiplier: 1 });
  });
});
