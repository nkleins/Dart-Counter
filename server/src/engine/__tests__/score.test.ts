import { describe, it, expect } from 'vitest';
import { dartPoints, isDouble, isTriple, isDoubleOrTriple } from '../score.js';

describe('dartPoints', () => {
  it('Zahl: segment * multiplier', () => {
    expect(dartPoints({ segment: 20, multiplier: 3 })).toBe(60);
    expect(dartPoints({ segment: 19, multiplier: 1 })).toBe(19);
  });
  it('Miss = 0', () => {
    expect(dartPoints({ segment: 0, multiplier: 0 })).toBe(0);
  });
  it('Bull außen = 25, innen = 50', () => {
    expect(dartPoints({ segment: 25, multiplier: 1 })).toBe(25);
    expect(dartPoints({ segment: 25, multiplier: 2 })).toBe(50);
  });
});

describe('isDouble / isTriple', () => {
  it('Double einer Zahl', () => {
    expect(isDouble({ segment: 16, multiplier: 2 })).toBe(true);
    expect(isDouble({ segment: 16, multiplier: 1 })).toBe(false);
  });
  it('Bull innen (50) zählt als Double', () => {
    expect(isDouble({ segment: 25, multiplier: 2 })).toBe(true);
    expect(isDouble({ segment: 25, multiplier: 1 })).toBe(false);
  });
  it('Triple einer Zahl, Bull nie Triple', () => {
    expect(isTriple({ segment: 20, multiplier: 3 })).toBe(true);
    expect(isTriple({ segment: 25, multiplier: 3 })).toBe(false);
  });
  it('isDoubleOrTriple', () => {
    expect(isDoubleOrTriple({ segment: 20, multiplier: 3 })).toBe(true);
    expect(isDoubleOrTriple({ segment: 20, multiplier: 2 })).toBe(true);
    expect(isDoubleOrTriple({ segment: 20, multiplier: 1 })).toBe(false);
  });
});
