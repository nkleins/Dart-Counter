import { describe, it, expect } from 'vitest';
import { suggestCheckout } from '../checkout.js';

describe('suggestCheckout (double out)', () => {
  it('finisht 40 auf D20', () => {
    expect(suggestCheckout(40, 3, 'double')).toEqual(['D20']);
  });
  it('finisht 50 auf Bull', () => {
    expect(suggestCheckout(50, 3, 'double')).toEqual(['Bull']);
  });
  it('finisht 100 in zwei Darts (T20, D20)', () => {
    expect(suggestCheckout(100, 3, 'double')).toEqual(['T20', 'D20']);
  });
  it('finisht 170 (T20, T20, Bull)', () => {
    expect(suggestCheckout(170, 3, 'double')).toEqual(['T20', 'T20', 'Bull']);
  });
  it('gibt null bei Bogey-Zahl 169', () => {
    expect(suggestCheckout(169, 3, 'double')).toBeNull();
  });
  it('gibt null, wenn zu wenige Darts übrig sind', () => {
    expect(suggestCheckout(100, 1, 'double')).toBeNull();
  });
  it('respektiert übrige Darts im Zug (nur 1 Dart -> nur direktes Finish)', () => {
    expect(suggestCheckout(40, 1, 'double')).toEqual(['D20']);
  });
});

describe('suggestCheckout (Out-Regeln)', () => {
  it('straight out finisht 7 direkt auf S7', () => {
    expect(suggestCheckout(7, 3, 'straight')).toEqual(['S7']);
  });
  it('master out finisht 60 direkt auf T20', () => {
    expect(suggestCheckout(60, 1, 'master')).toEqual(['T20']);
  });
  it('double out kann 60 nicht in einem Dart finishen', () => {
    expect(suggestCheckout(60, 1, 'double')).toBeNull();
  });
});
