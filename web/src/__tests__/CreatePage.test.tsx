import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CreatePage } from '../pages/CreatePage.js';
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
