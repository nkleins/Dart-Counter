import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Fold } from '../components/Fold.js';

describe('Fold', () => {
  it('startet zu und zeigt den Inhalt erst nach Klick auf die Kopfzeile', () => {
    const { getByText, queryByText } = render(<Fold label="Optionen" summary="501"><div>INHALT</div></Fold>);
    expect(queryByText('INHALT')).toBe(null);
    const btn = getByText('Optionen').closest('button')!;
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(getByText('INHALT')).toBeTruthy();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('startet offen mit defaultOpen', () => {
    const { getByText } = render(<Fold label="X" summary="" defaultOpen><div>INHALT</div></Fold>);
    expect(getByText('INHALT')).toBeTruthy();
  });

  it('zeigt die Summary in der Kopfzeile', () => {
    const { getByText } = render(<Fold label="Format" summary="Casual · Ein Leg"><div /></Fold>);
    expect(getByText('Casual · Ein Leg')).toBeTruthy();
  });
});
