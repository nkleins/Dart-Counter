import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGame } from '../useGame.js';
import type { GameView } from '../types.js';

class FakeWS {
  static last: FakeWS | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) { FakeWS.last = this; setTimeout(() => this.onopen?.(), 0); }
  send() {}
  close() { this.onclose?.(); }
}

const view: GameView = {
  slug: 's', gameType: 'x01', options: {}, status: 'running', createdAt: 0, expiresAt: 0,
  players: [], history: [],
  state: { currentPlayerId: 'a', round: 1, dartsThrownThisTurn: 0, dartsThisTurnTotal: 3, finished: false, winnerId: null, players: [] } as never,
  match: { format: { kind: 'casual' }, legsWon: {}, setsWon: {}, legNumber: 1, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false },
};

beforeEach(() => { vi.stubGlobal('WebSocket', FakeWS as never); });

describe('useGame', () => {
  it('übernimmt WebSocket-Nachrichten in view', async () => {
    const { result } = renderHook(() => useGame('s'));
    act(() => { FakeWS.last!.onmessage?.({ data: JSON.stringify(view) }); });
    await waitFor(() => expect(result.current.view?.state.currentPlayerId).toBe('a'));
  });
});
