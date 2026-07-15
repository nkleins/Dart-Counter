import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinishActions } from '../components/FinishActions.js';

describe('FinishActions', () => {
  it('bietet Neustarten, Modus wechseln und Hauptmenü', async () => {
    const onRestart = vi.fn();
    const onChangeMode = vi.fn();
    const onHome = vi.fn();
    render(<FinishActions onRestart={onRestart} onChangeMode={onChangeMode} onHome={onHome} />);

    await userEvent.click(screen.getByRole('button', { name: 'Neustarten' }));
    expect(onRestart).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Zurück zum Hauptmenü' }));
    expect(onHome).toHaveBeenCalled();

    // Modus wechseln öffnet die Auswahl, dann Cricket wählen
    await userEvent.click(screen.getByRole('button', { name: 'Modus wechseln' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cricket' }));
    expect(onChangeMode).toHaveBeenCalledWith('cricket', expect.anything());
  });
});
