import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CreatePage } from '../pages/CreatePage.js';
import { GameOptionsPicker } from '../components/GameOptionsPicker.js';
import * as api from '../api.js';

const nav = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => nav }));

beforeEach(() => { nav.mockReset(); });

describe('CreatePage', () => {
  it('erstellt x01 mit Spielern und navigiert', async () => {
    vi.spyOn(api, 'createGame').mockResolvedValue({ slug: 'abc' });
    render(<MemoryRouter><CreatePage /></MemoryRouter>);
    await userEvent.type(screen.getByPlaceholderText(/name/i), 'Mia');
    await userEvent.click(screen.getByRole('button', { name: /hinzufügen|add|\+/i }));
    await userEvent.click(screen.getByRole('button', { name: /spiel erstellen/i }));
    expect(api.createGame).toHaveBeenCalledWith(expect.objectContaining({ gameType: 'x01', players: ['Mia'] }));
    expect(nav).toHaveBeenCalledWith('/g/abc');
  });
});

describe('GameOptionsPicker Format', () => {
  it('Format: Single Set zeigt Leg-Unter-Buttons und meldet legs im Format', () => {
    const onChange = vi.fn();
    const { getByText } = render(<GameOptionsPicker onChange={onChange} />);
    fireEvent.click(getByText('Format')); // Fold aufklappen
    fireEvent.click(getByText('Single Set'));
    // Unter-Buttons erscheinen
    fireEvent.click(getByText('7 Legs'));
    const last = onChange.mock.calls.at(-1)!;
    const opts = last[1] as { format: { kind: string; legs: number } };
    expect(opts.format).toEqual({ kind: 'singleSet', legs: 7 });
  });

  it('Format: Casual ist Default', () => {
    const onChange = vi.fn();
    render(<GameOptionsPicker onChange={onChange} />);
    const first = onChange.mock.calls[0]!;
    expect((first[1] as { format: { kind: string } }).format).toEqual({ kind: 'casual' });
  });

  it('Around the Clock hat keinen Optionen-Fold', () => {
    const onChange = vi.fn();
    const { getByText, queryByText } = render(<GameOptionsPicker onChange={onChange} />);
    expect(getByText('Optionen')).toBeTruthy();       // x01: Optionen-Fold vorhanden
    fireEvent.click(getByText('Around the Clock'));
    expect(queryByText('Optionen')).toBe(null);        // ATC: kein Optionen-Fold
  });
});
