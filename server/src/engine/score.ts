import type { Dart } from './types.js';

export function dartPoints(d: Dart): number {
  if (d.segment === 0 || d.multiplier === 0) return 0;
  return d.segment * d.multiplier;
}

/** Double einer Zahl ODER Bull innen (50). */
export function isDouble(d: Dart): boolean {
  return d.multiplier === 2; // gilt für Zahl-Double und Bull innen (segment 25, mult 2)
}

/** Triple einer Zahl. Bull hat kein Triple. */
export function isTriple(d: Dart): boolean {
  return d.segment !== 25 && d.multiplier === 3;
}

export function isDoubleOrTriple(d: Dart): boolean {
  return isDouble(d) || isTriple(d);
}
