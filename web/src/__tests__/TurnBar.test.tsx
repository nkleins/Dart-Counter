import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TurnBar } from '../components/TurnBar.js';
import type { MatchSummary, PlayerMeta } from '../types.js';

const players: PlayerMeta[] = [
  { id: 'a', name: 'A', order: 0, joinedAtRound: 0, catchUp: 'handicap' },
  { id: 'b', name: 'B', order: 1, joinedAtRound: 0, catchUp: 'handicap' },
];
const base = { name: 'A', dartsThrownThisTurn: 0, dartsThisTurnTotal: 3, onUndo: vi.fn(), players };

describe('TurnBar — Zähler', () => {
  it('casual: kein Zähler', () => {
    const match: MatchSummary = { format: { kind: 'casual' }, legsWon: { a: 0, b: 0 }, setsWon: { a: 0, b: 0 }, legNumber: 1, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false };
    const { queryByText } = render(<TurnBar {...base} match={match} />);
    expect(queryByText(/Legs/)).toBe(null);
  });

  it('singleSet: zeigt Legs-Stand', () => {
    const match: MatchSummary = { format: { kind: 'singleSet', legs: 3 }, legsWon: { a: 2, b: 1 }, setsWon: { a: 0, b: 0 }, legNumber: 4, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false };
    const { getByText } = render(<TurnBar {...base} match={match} />);
    expect(getByText(/Legs\s+2.1/)).toBeTruthy();
  });

  it('match: zeigt Sets und Legs', () => {
    const match: MatchSummary = { format: { kind: 'match', sets: 3, legs: 3 }, legsWon: { a: 1, b: 0 }, setsWon: { a: 1, b: 0 }, legNumber: 2, setNumber: 2, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false };
    const { getByText } = render(<TurnBar {...base} match={match} />);
    expect(getByText(/Sets\s+1.0/)).toBeTruthy();
    expect(getByText(/Legs\s+1.0/)).toBeTruthy();
  });
});
