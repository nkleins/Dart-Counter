import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GamePage } from '../pages/GamePage.js';
import type { GameView } from '../types.js';

const view: GameView = {
  slug: 's', gameType: 'x01', options: { start: 501 }, status: 'running', createdAt: 0, expiresAt: 0,
  players: [{ id: 'a', name: 'Mia', order: 0, joinedAtRound: 0, catchUp: 'handicap' }],
  history: [],
  state: { currentPlayerId: 'a', round: 1, dartsThrownThisTurn: 1, dartsThisTurnTotal: 3, finished: false, winnerId: null,
    players: [{ playerId: 'a', remaining: 441, dartsThrown: 1, opened: true, finished: false }] } as never,
};

vi.mock('../useGame.js', () => ({
  useGame: () => ({ view, connected: true, throwDart: vi.fn(), undo: vi.fn(), join: vi.fn(), extend: vi.fn(), reset: vi.fn() }),
}));

describe('GamePage', () => {
  it('zeigt den aktuellen Spieler in der TurnBar', () => {
    render(<MemoryRouter initialEntries={['/g/s']}><Routes><Route path="/g/:slug" element={<GamePage />} /></Routes></MemoryRouter>);
    expect(screen.getAllByText(/Mia/).length).toBeGreaterThan(0);
    expect(screen.getByText(/ist dran/i)).toBeTruthy();
  });
});
