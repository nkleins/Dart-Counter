import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinishActions } from '../components/FinishActions.js';

describe('FinishActions', () => {
  it('bietet Neustarten und Hauptmenü', async () => {
    const onRestart = vi.fn();
    const onHome = vi.fn();
    render(<FinishActions onRestart={onRestart} onChangeMode={vi.fn()} onHome={onHome} />);
    await userEvent.click(screen.getByRole('button', { name: 'Neustarten' }));
    expect(onRestart).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Zurück zum Hauptmenü' }));
    expect(onHome).toHaveBeenCalled();
  });

  it('Modus wechseln mit Sub-Optionen (x01 301 / master out)', async () => {
    const onChangeMode = vi.fn();
    render(<FinishActions onRestart={vi.fn()} onChangeMode={onChangeMode} onHome={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Modus wechseln' }));
    // x01 ist Default; Start 301 und Out: master wählen
    await userEvent.click(screen.getByRole('button', { name: '301' }));
    await userEvent.click(screen.getByRole('button', { name: 'Out: master' }));
    await userEvent.click(screen.getByRole('button', { name: /Neues Spiel starten/ }));
    expect(onChangeMode).toHaveBeenCalledWith('x01', { start: 301, in: 'straight', out: 'master' });
  });

  it('Modus wechseln zu Cricket Cut-Throat', async () => {
    const onChangeMode = vi.fn();
    render(<FinishActions onRestart={vi.fn()} onChangeMode={onChangeMode} onHome={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Modus wechseln' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cricket' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cut-Throat' }));
    await userEvent.click(screen.getByRole('button', { name: /Neues Spiel starten/ }));
    expect(onChangeMode).toHaveBeenCalledWith('cricket', { mode: 'cutthroat', bull: true });
  });
});
