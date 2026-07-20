import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TurnBar } from '../components/TurnBar.js';
import type { MatchSummary } from '../types.js';

const base = { name: 'A', dartsThrownThisTurn: 0, dartsThisTurnTotal: 3, onUndo: vi.fn(), activePlayerId: 'a' };

describe('TurnBar — Zähler (nur aktive Person)', () => {
  it('casual: kein Zähler', () => {
    const match: MatchSummary = { format: { kind: 'casual' }, legsWon: { a: 0, b: 0 }, setsWon: { a: 0, b: 0 }, legNumber: 1, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false, averages: null };
    const { queryByText } = render(<TurnBar {...base} match={match} />);
    expect(queryByText(/Legs/)).toBe(null);
  });

  it('singleSet: zeigt nur die Legs der aktiven Person', () => {
    const match: MatchSummary = { format: { kind: 'singleSet', legs: 3 }, legsWon: { a: 2, b: 1 }, setsWon: { a: 0, b: 0 }, legNumber: 4, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false, averages: null };
    const { getByText, queryByText } = render(<TurnBar {...base} match={match} />);
    expect(getByText(/Legs\s+2$/)).toBeTruthy();   // nur A's 2, nicht "2–1"
    expect(queryByText(/2.1/)).toBe(null);
  });

  it('match: zeigt Sets und Legs der aktiven Person', () => {
    const match: MatchSummary = { format: { kind: 'match', sets: 3, legs: 3 }, legsWon: { a: 1, b: 0 }, setsWon: { a: 1, b: 0 }, legNumber: 2, setNumber: 2, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false, averages: null };
    const { getByText } = render(<TurnBar {...base} match={match} />);
    expect(getByText(/Sets\s+1$/)).toBeTruthy();
    expect(getByText(/Legs\s+1$/)).toBeTruthy();
  });

  it('zeigt die Zahlen der jeweils aktiven Person (b statt a)', () => {
    const match: MatchSummary = { format: { kind: 'singleSet', legs: 3 }, legsWon: { a: 2, b: 1 }, setsWon: { a: 0, b: 0 }, legNumber: 4, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false, averages: null };
    const { getByText } = render(<TurnBar {...base} activePlayerId="b" match={match} />);
    expect(getByText(/Legs\s+1$/)).toBeTruthy();   // B's Stand
  });
});
