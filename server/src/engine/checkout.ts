import type { X01InOut } from './types.js';

interface DartOption {
  label: string;
  value: number;
  isDouble: boolean;
  isTriple: boolean;
}

/** Alle sinnvollen Einzeldarts (Singles, Doubles, Triples, Bull) — nach Wert absteigend. */
const ALL_DARTS: DartOption[] = (() => {
  const out: DartOption[] = [];
  for (let n = 1; n <= 20; n++) {
    out.push({ label: `T${n}`, value: n * 3, isDouble: false, isTriple: true });
    out.push({ label: `D${n}`, value: n * 2, isDouble: true, isTriple: false });
    out.push({ label: `S${n}`, value: n, isDouble: false, isTriple: false });
  }
  out.push({ label: 'Bull', value: 50, isDouble: true, isTriple: false }); // Bull innen zählt als Double
  out.push({ label: '25', value: 25, isDouble: false, isTriple: false });   // Bull außen
  return out.sort((a, b) => b.value - a.value);
})();

function isFinisher(d: DartOption, out: X01InOut): boolean {
  if (out === 'straight') return true;
  if (out === 'double') return d.isDouble;
  return d.isDouble || d.isTriple; // master
}

/**
 * Checkout-Vorschlag: eine Dart-Folge, die `remaining` in höchstens `dartsLeft`
 * (max. 3) Darts auf 0 bringt und dabei die Out-Regel erfüllt. Bevorzugt die
 * wenigsten Darts und hohe Setup-Würfe. Gibt `null` zurück, wenn kein Finish
 * möglich ist (z. B. Bogey-Zahlen wie 169 bei Double-Out oder Rest > 170).
 */
export function suggestCheckout(remaining: number, dartsLeft: number, out: X01InOut): string[] | null {
  const maxDarts = Math.min(3, dartsLeft);
  if (remaining <= 0 || maxDarts <= 0) return null;

  const solve = (rest: number, darts: number): string[] | null => {
    if (darts === 1) {
      const finish = ALL_DARTS.find((d) => d.value === rest && isFinisher(d, out));
      return finish ? [finish.label] : null;
    }
    for (const d of ALL_DARTS) {
      if (d.value >= rest) continue; // Setup-Dart muss echt weniger als der Rest sein
      const tail = solve(rest - d.value, darts - 1);
      if (tail) return [d.label, ...tail];
    }
    return null;
  };

  for (let k = 1; k <= maxDarts; k++) {
    const path = solve(remaining, k);
    if (path) return path;
  }
  return null;
}
