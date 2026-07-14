import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WinPopup } from '../components/WinPopup.js';

describe('WinPopup', () => {
  it('zeigt Gewinner und Undo-Button', async () => {
    const onUndo = vi.fn();
    render(<WinPopup winnerName="Mia" onUndo={onUndo} onClose={vi.fn()} />);
    expect(screen.getByText(/Mia/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /fehltipp|zurück|undo/i }));
    expect(onUndo).toHaveBeenCalled();
  });
});
