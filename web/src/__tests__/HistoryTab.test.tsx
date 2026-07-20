import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HistoryTab } from '../components/HistoryTab.js';
import type { GameView } from '../types.js';

const casualMatch = { format: { kind: 'casual' as const }, legsWon: {}, setsWon: {}, legNumber: 1, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false };

function view(kind: 'casual' | 'singleSet', status: GameView['status']): GameView {
  return {
    slug: 's', gameType: 'x01', options: {}, status, createdAt: 0, expiresAt: 0,
    players: [{ id: 'a', name: 'A', order: 0, joinedAtRound: 0, catchUp: 'handicap' }],
    state: { currentPlayerId: 'a', round: 1, dartsThrownThisTurn: 0, dartsThisTurnTotal: 3, finished: false, winnerId: null, players: [], checkout: null } as GameView['state'],
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
