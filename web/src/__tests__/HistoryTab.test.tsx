import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HistoryTab } from '../components/HistoryTab.js';
import type { GameView } from '../types.js';

const casualMatch = { format: { kind: 'casual' as const }, legsWon: {}, setsWon: {}, legNumber: 1, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false, averages: null };

function view(kind: 'casual' | 'singleSet', status: GameView['status']): GameView {
  return {
    slug: 's', gameType: 'x01', options: {}, status, createdAt: 0, expiresAt: 0,
    players: [{ id: 'a', name: 'A', order: 0, joinedAtRound: 0, catchUp: 'handicap' }],
    state: { currentPlayerId: 'a', round: 1, dartsThrownThisTurn: 0, dartsThisTurnTotal: 3, finished: false, winnerId: null, players: [], checkout: null, turnPoints: 0 } as GameView['state'],
    history: [],
    match: kind === 'casual' ? casualMatch : { ...casualMatch, format: { kind: 'singleSet', legs: 3 } },
  };
}
const noop = () => {};

describe('HistoryTab — Beitritts-Sperre', () => {
  it('Single Set + running: Name-Eingabe ist deaktiviert', () => {
    const { getByPlaceholderText } = render(<HistoryTab view={view('singleSet', 'running')} onJoin={noop} onRemove={noop} onExtend={noop} onHome={noop} />);
    expect((getByPlaceholderText('Name…') as HTMLInputElement).disabled).toBe(true);
  });
  it('Casual + running: Name-Eingabe ist aktiv', () => {
    const { getByPlaceholderText } = render(<HistoryTab view={view('casual', 'running')} onJoin={noop} onRemove={noop} onExtend={noop} onHome={noop} />);
    expect((getByPlaceholderText('Name…') as HTMLInputElement).disabled).toBe(false);
  });
});

describe('HistoryTab — Verlauf-Gruppierung', () => {
  const hist = (seq: number, set: number, leg: number) => ({ seq, playerId: 'a', segment: 20, multiplier: 3, round: 1, dartNo: 1, catchUp: false, set, leg });

  it('Single Set: Verlauf nach Leg gruppiert mit Überschriften', () => {
    const v = view('singleSet', 'running');
    v.history = [hist(1, 1, 1), hist(2, 1, 2)];
    const { getByText } = render(<HistoryTab view={v} onJoin={noop} onRemove={noop} onExtend={noop} onHome={noop} />);
    expect(getByText('Leg 1')).toBeTruthy();
    expect(getByText('Leg 2')).toBeTruthy();
  });

  it('Casual: Verlauf bleibt flach (keine Leg-Überschrift)', () => {
    const v = view('casual', 'running');
    v.history = [hist(1, 1, 1)];
    const { queryByText } = render(<HistoryTab view={v} onJoin={noop} onRemove={noop} onExtend={noop} onHome={noop} />);
    expect(queryByText(/^Leg 1$/)).toBe(null);
  });
});

describe('HistoryTab — Standings', () => {
  it('Single Set: Standings-Block mit Format-Label und Legs-Spalte', () => {
    const { getByText } = render(<HistoryTab view={view('singleSet', 'running')} onJoin={noop} onRemove={noop} onExtend={noop} onHome={noop} />);
    expect(getByText('Standings')).toBeTruthy();
    expect(getByText(/Single Set.*Best of 3 Legs/)).toBeTruthy();
    expect(getByText('Legs')).toBeTruthy();
  });

  it('Casual x01: Standings zeigt Format und Ø-Spalte', () => {
    const { getByText } = render(<HistoryTab view={view('casual', 'running')} onJoin={noop} onRemove={noop} onExtend={noop} onHome={noop} />);
    expect(getByText(/Casual.*Ein Leg/)).toBeTruthy();
    expect(getByText('Ø')).toBeTruthy();
  });
});
