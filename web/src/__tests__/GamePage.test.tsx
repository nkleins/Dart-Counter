import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  match: { format: { kind: 'casual' }, legsWon: {}, setsWon: {}, legNumber: 1, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false },
};

vi.mock('../useGame.js', () => ({
  useGame: () => ({ view, throwDart: vi.fn(), undo: vi.fn(), join: vi.fn(), removePlayer: vi.fn(), extend: vi.fn(), reset: vi.fn() }),
}));

beforeEach(() => {
  view.state = { currentPlayerId: 'a', round: 1, dartsThrownThisTurn: 1, dartsThisTurnTotal: 3, finished: false, winnerId: null,
    players: [{ playerId: 'a', remaining: 441, dartsThrown: 1, opened: true, finished: false }] } as never;
  view.match = { format: { kind: 'casual' }, legsWon: {}, setsWon: {}, legNumber: 1, setNumber: 1, legWinnerId: null, setWinnerId: null, matchWinnerId: null, finished: false };
});

describe('GamePage', () => {
  it('zeigt den aktuellen Spieler in der TurnBar', () => {
    render(<MemoryRouter initialEntries={['/g/s']}><Routes><Route path="/g/:slug" element={<GamePage />} /></Routes></MemoryRouter>);
    expect(screen.getAllByText(/Mia/).length).toBeGreaterThan(0);
    expect(screen.getByText(/ist dran/i)).toBeTruthy();
  });

  it('zeigt das Leg-Banner zwischen den Legs', () => {
    view.match = { format: { kind: 'singleSet', legs: 5 }, legsWon: { a: 1 }, setsWon: {}, legNumber: 2, setNumber: 1, legWinnerId: 'a', setWinnerId: null, matchWinnerId: null, finished: false };
    render(<MemoryRouter initialEntries={['/g/s']}><Routes><Route path="/g/:slug" element={<GamePage />} /></Routes></MemoryRouter>);
    expect(screen.getByText(/Leg an/)).toBeTruthy();
    expect(screen.queryByText(/gewinnt!/)).toBeNull();
  });

  it('zeigt das WinPopup erst bei Match-Ende', () => {
    view.match = { format: { kind: 'singleSet', legs: 5 }, legsWon: { a: 3 }, setsWon: {}, legNumber: 5, setNumber: 1, legWinnerId: 'a', setWinnerId: null, matchWinnerId: 'a', finished: true };
    render(<MemoryRouter initialEntries={['/g/s']}><Routes><Route path="/g/:slug" element={<GamePage />} /></Routes></MemoryRouter>);
    const winLine = screen.getByText(/gewinnt!/);
    expect(winLine.textContent).toContain('Mia');
  });
});
