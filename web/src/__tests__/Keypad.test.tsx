import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Keypad } from '../components/Keypad.js';

describe('Keypad', () => {
  it('Single 20 feuert {20,1}', async () => {
    const onThrow = vi.fn();
    render(<Keypad onThrow={onThrow} />);
    await userEvent.click(screen.getByRole('button', { name: '20' }));
    expect(onThrow).toHaveBeenCalledWith({ segment: 20, multiplier: 1 });
  });
  it('Triple dann 20 feuert {20,3} und setzt zurück auf Single', async () => {
    const onThrow = vi.fn();
    render(<Keypad onThrow={onThrow} />);
    await userEvent.click(screen.getByRole('button', { name: 'Triple' }));
    await userEvent.click(screen.getByRole('button', { name: '20' }));
    expect(onThrow).toHaveBeenLastCalledWith({ segment: 20, multiplier: 3 });
    await userEvent.click(screen.getByRole('button', { name: '19' }));
    expect(onThrow).toHaveBeenLastCalledWith({ segment: 19, multiplier: 1 });
  });
  it('Miss feuert {0,0}', async () => {
    const onThrow = vi.fn();
    render(<Keypad onThrow={onThrow} />);
    await userEvent.click(screen.getByRole('button', { name: 'Miss' }));
    expect(onThrow).toHaveBeenCalledWith({ segment: 0, multiplier: 0 });
  });
  it('Miss-Button bekommt beim Antippen die Flash-Klasse', () => {
    const onThrow = vi.fn();
    const { getByText } = render(<Keypad onThrow={onThrow} />);
    const miss = getByText('Miss');
    fireEvent.click(miss);
    expect(miss.className).toContain('dart-flash');
    expect(onThrow).toHaveBeenCalledWith({ segment: 0, multiplier: 0 });
  });
});
