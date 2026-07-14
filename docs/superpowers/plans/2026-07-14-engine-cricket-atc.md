# Spiel-Engine: Cricket + Around the Clock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Engine um **Cricket** (Standard + Cut-Throat, mit toten Zahlen) und
**Around the Clock** erweitern — beide als reine Funktionen über der flachen Wurfliste,
konsistent mit der x01-Engine aus Plan 1.

**Architecture:** Wie x01: `computeCricketState` / `computeAtcState` sind reine
Funktionen `(options, players, darts) → State`. Gemeinsame Zug-Logik (Gruppierung,
aktueller Spieler, Runde) wird in `turns.ts` extrahiert und von allen Engines genutzt.

**Tech Stack:** wie Plan 1 (Node ≥ 20, TypeScript strict, ESM, Vitest).

**Voraussetzung:** Plan 1 ist umgesetzt (x01-Engine grün).

## Global Constraints

Identisch zu Plan 1 (TS strict, ESM, Node 20, Dart-Darstellung `{segment,multiplier}`,
Commits nur Meilensteine / Autor nur User). Zusätzlich:

- **Cricket-Ziele:** `20, 19, 18, 17, 16, 15` und — wenn `options.bull` — `25` (Bull).
  Punktwert eines Ziels: die Zahl selbst, Bull = 25.
- **Marks pro Dart:** Multiplikator = Anzahl Marks (Single 1, Double 2, Triple 3;
  Bull außen 1, Bull innen 2). Nur Treffer auf ein Ziel zählen; alles andere = 0 Marks.
- **Zu (closed):** 3 Marks auf einem Ziel. **Tot (dead):** Ziel von **allen** zu.
- **Cricket-Sieg:** Standard = alle Ziele zu **und** Punkte ≥ Maximum aller Spieler.
  Cut-Throat = alle Ziele zu **und** Punkte ≤ Minimum aller Spieler.
- **ATC-Reihenfolge:** `1 → 2 → … → 20 → 25 (Bull)`. Treffer aufs aktuelle Ziel rückt
  vor. `advanceByMultiplier` (Default true): Double/Triple des Ziels rücken 2/3 vor.

---

## File Structure

```
server/src/engine/
  turns.ts             # NEU: groupTurns, Turn, turnCursor, roundFor (aus x01 extrahiert)
  x01.ts               # refactored: nutzt turns.ts
  cricket.ts           # NEU: computeCricketState
  atc.ts               # NEU: computeAtcState
  types.ts             # erweitert: CricketOptions, AtcOptions
  __tests__/
    turns.test.ts      # NEU
    cricket.test.ts    # NEU
    atc.test.ts        # NEU
```

---

### Task 1: Zug-Logik nach `turns.ts` extrahieren (Refactor)

Zieht `groupTurns` und die Cursor-/Runden-Berechnung aus `x01.ts` in ein
wiederverwendbares Modul. x01-Tests müssen grün bleiben.

**Files:**
- Create: `server/src/engine/turns.ts`
- Create: `server/src/engine/__tests__/turns.test.ts`
- Modify: `server/src/engine/x01.ts`

**Interfaces:**
- Produces:
  ```ts
  interface Turn { playerId: string; darts: PlayerDart[]; }
  function groupTurns(darts: PlayerDart[]): Turn[]
  function turnCursor(turns: Turn[], order: string[], lastTurnComplete: boolean): { currentPlayerId: string | null; dartsThrownThisTurn: number }
  function roundFor(turns: Turn[], order: string[], currentPlayerId: string, lastComplete: boolean): number
  ```

- [ ] **Step 1: Failing test schreiben**

`server/src/engine/__tests__/turns.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { groupTurns, turnCursor, roundFor } from '../turns.js';
import type { PlayerDart } from '../types.js';

const d = (playerId: string, segment: number, multiplier: number): PlayerDart => ({ playerId, segment, multiplier });

describe('groupTurns', () => {
  it('gruppiert aufeinanderfolgende Würfe desselben Spielers, max 3', () => {
    const turns = groupTurns([d('a',1,1), d('a',1,1), d('a',1,1), d('a',1,1), d('b',1,1)]);
    expect(turns.map(t => [t.playerId, t.darts.length])).toEqual([['a',3],['a',1],['b',1]]);
  });
});

describe('turnCursor', () => {
  it('leeres Spiel: erster Spieler, 0 Darts', () => {
    expect(turnCursor([], ['a','b'], true)).toEqual({ currentPlayerId: 'a', dartsThrownThisTurn: 0 });
  });
  it('unvollständiger letzter Zug: selber Spieler', () => {
    const turns = groupTurns([d('a',1,1), d('a',1,1)]);
    expect(turnCursor(turns, ['a','b'], false)).toEqual({ currentPlayerId: 'a', dartsThrownThisTurn: 2 });
  });
  it('abgeschlossener letzter Zug: nächster Spieler', () => {
    const turns = groupTurns([d('a',1,1), d('a',1,1), d('a',1,1)]);
    expect(turnCursor(turns, ['a','b'], true)).toEqual({ currentPlayerId: 'b', dartsThrownThisTurn: 0 });
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd server && npx vitest run src/engine/__tests__/turns.test.ts`
Expected: FAIL — `../turns.js` existiert nicht.

- [ ] **Step 3: `turns.ts` anlegen**

`server/src/engine/turns.ts`:
```ts
import type { PlayerDart } from './types.js';

export interface Turn {
  playerId: string;
  darts: PlayerDart[];
}

/** Aufeinanderfolgende Würfe desselben Spielers = ein Zug (max. 3 Darts). */
export function groupTurns(darts: PlayerDart[]): Turn[] {
  const turns: Turn[] = [];
  for (const dart of darts) {
    const last = turns[turns.length - 1];
    if (last && last.playerId === dart.playerId && last.darts.length < 3) {
      last.darts.push(dart);
    } else {
      turns.push({ playerId: dart.playerId, darts: [dart] });
    }
  }
  return turns;
}

/** Aktueller Spieler + bereits geworfene Darts im laufenden Zug. */
export function turnCursor(
  turns: Turn[],
  order: string[],
  lastTurnComplete: boolean,
): { currentPlayerId: string | null; dartsThrownThisTurn: number } {
  if (turns.length === 0) {
    return { currentPlayerId: order[0] ?? null, dartsThrownThisTurn: 0 };
  }
  const last = turns[turns.length - 1]!;
  const lastIdx = order.indexOf(last.playerId);
  const curIdx = lastTurnComplete ? (lastIdx + 1) % order.length : lastIdx;
  return {
    currentPlayerId: order[curIdx] ?? null,
    dartsThrownThisTurn: lastTurnComplete ? 0 : last.darts.length,
  };
}

/** Runde des aktuellen Spielers = abgeschlossene Züge dieses Spielers + 1. */
export function roundFor(turns: Turn[], order: string[], currentPlayerId: string, lastComplete: boolean): number {
  let completed = 0;
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i]!;
    const isLast = i === turns.length - 1;
    const complete = !isLast || lastComplete;
    if (t.playerId === currentPlayerId && complete) completed += 1;
  }
  return completed + 1;
}
```

- [ ] **Step 4: `x01.ts` auf `turns.ts` umstellen**

In `server/src/engine/x01.ts`:
1. Die lokale `interface Turn` und die lokale `function groupTurns` **entfernen**.
2. Oben importieren:
```ts
import { groupTurns, turnCursor, roundFor, type Turn } from './turns.js';
```
3. `assembleState` ersetzen durch die Variante, die `turnCursor`/`roundFor` nutzt:
```ts
function assembleState(
  order: string[],
  ps: Map<string, X01PlayerState>,
  turns: Turn[],
  winnerId: string | null,
  lastTurnComplete: boolean,
): X01State {
  const players_out = order.map((id) => ps.get(id)!);
  if (winnerId) {
    return {
      currentPlayerId: null,
      round: Math.max(1, Math.ceil(turns.length / Math.max(1, order.length))),
      dartsThrownThisTurn: 0,
      finished: true,
      winnerId,
      players: players_out,
    };
  }
  const { currentPlayerId, dartsThrownThisTurn } = turnCursor(turns, order, lastTurnComplete);
  const round = currentPlayerId ? roundFor(turns, order, currentPlayerId, lastTurnComplete) : 1;
  return { currentPlayerId, round, dartsThrownThisTurn, finished: false, winnerId: null, players: players_out };
}
```
4. Die alte lokale `function roundOf(...)` in `x01.ts` **entfernen** (ersetzt durch `roundFor`).

- [ ] **Step 5: Alle Tests + Typecheck**

Run: `cd server && npx vitest run && npx tsc --noEmit`
Expected: PASS (turns-, x01-, score-Tests alle grün), kein Typfehler.

- [ ] **Step 6: Commit**

```bash
git add server/src/engine/
git commit -m "Engine: Zug-Logik nach turns.ts extrahiert (x01 refactor)"
```

---

### Task 2: Cricket — Marks (ohne Punkte)

Marks pro Ziel (0..3), Multiplikator = Marks, Deckelung bei 3. Noch keine Punkte.

**Files:**
- Modify: `server/src/engine/types.ts`
- Create: `server/src/engine/cricket.ts`
- Create: `server/src/engine/__tests__/cricket.test.ts`

**Interfaces:**
- `CricketOptions { mode: 'standard' | 'cutthroat'; bull: boolean }` (in `types.ts`).
- Produces:
  ```ts
  interface CricketPlayerState { playerId: string; marks: Record<number, number>; score: number; closedAll: boolean; }
  interface CricketState {
    currentPlayerId: string | null; round: number; dartsThrownThisTurn: number;
    finished: boolean; winnerId: string | null;
    targets: number[]; deadTargets: number[]; players: CricketPlayerState[];
  }
  function computeCricketState(options: CricketOptions, players: PlayerInput[], darts: PlayerDart[]): CricketState
  ```

- [ ] **Step 1: `CricketOptions` in `types.ts` ergänzen**

Am Ende von `server/src/engine/types.ts` anfügen:
```ts
export interface CricketOptions {
  mode: 'standard' | 'cutthroat';
  bull: boolean;
}
```

- [ ] **Step 2: Failing test schreiben**

`server/src/engine/__tests__/cricket.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeCricketState } from '../cricket.js';
import type { PlayerInput, PlayerDart, CricketOptions } from '../types.js';

const OPTS: CricketOptions = { mode: 'standard', bull: true };
const PLAYERS: PlayerInput[] = [
  { id: 'a', name: 'A', order: 0 },
  { id: 'b', name: 'B', order: 1 },
];
const d = (playerId: string, segment: number, multiplier: number): PlayerDart => ({ playerId, segment, multiplier });
const marksOf = (s: ReturnType<typeof computeCricketState>, id: string, t: number) =>
  s.players.find(p => p.playerId === id)!.marks[t] ?? 0;

describe('computeCricketState — Marks', () => {
  it('Single auf 20 = 1 Mark', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 20, 1)]);
    expect(marksOf(s, 'a', 20)).toBe(1);
  });
  it('Triple auf 20 = 3 Marks (zu)', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 20, 3)]);
    expect(marksOf(s, 'a', 20)).toBe(3);
    expect(s.players.find(p => p.playerId === 'a')!.closedAll).toBe(false);
  });
  it('Marks deckeln bei 3', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 20, 3), d('a', 20, 3)]);
    expect(marksOf(s, 'a', 20)).toBe(3);
  });
  it('Nicht-Ziel (z.B. 3) zählt nicht', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 3, 3)]);
    expect(marksOf(s, 'a', 3)).toBe(0);
  });
  it('Bull ist Ziel, wenn options.bull', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 25, 2)]);
    expect(marksOf(s, 'a', 25)).toBe(2);
  });
  it('Rotation: nach 3 Darts ist B dran', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a',20,1), d('a',20,1), d('a',20,1)]);
    expect(s.currentPlayerId).toBe('b');
  });
});
```

- [ ] **Step 3: Test laufen lassen — muss fehlschlagen**

Run: `cd server && npx vitest run src/engine/__tests__/cricket.test.ts`
Expected: FAIL — `../cricket.js` existiert nicht.

- [ ] **Step 4: `cricket.ts` implementieren (nur Marks)**

`server/src/engine/cricket.ts`:
```ts
import type { CricketOptions, PlayerDart, PlayerInput } from './types.js';
import { groupTurns, turnCursor, roundFor } from './turns.js';

export interface CricketPlayerState {
  playerId: string;
  marks: Record<number, number>;
  score: number;
  closedAll: boolean;
}

export interface CricketState {
  currentPlayerId: string | null;
  round: number;
  dartsThrownThisTurn: number;
  finished: boolean;
  winnerId: string | null;
  targets: number[];
  deadTargets: number[];
  players: CricketPlayerState[];
}

const BASE_TARGETS = [20, 19, 18, 17, 16, 15];

export function cricketTargets(options: CricketOptions): number[] {
  return options.bull ? [...BASE_TARGETS, 25] : [...BASE_TARGETS];
}

export function computeCricketState(
  options: CricketOptions,
  players: PlayerInput[],
  darts: PlayerDart[],
): CricketState {
  const targets = cricketTargets(options);
  const order = [...players].sort((a, b) => a.order - b.order).map((p) => p.id);
  const ps = new Map<string, CricketPlayerState>(
    players.map((p) => [p.id, { playerId: p.id, marks: {}, score: 0, closedAll: false }]),
  );

  const turns = groupTurns(darts);
  const winnerId: string | null = null;
  let lastTurnComplete = true;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    const state = ps.get(turn.playerId);
    if (!state) continue;
    for (const dart of turn.darts) {
      if (!targets.includes(dart.segment)) continue;
      const marks = dart.multiplier; // 1..3 (Bull: 1 oder 2)
      const cur = state.marks[dart.segment] ?? 0;
      state.marks[dart.segment] = Math.min(3, cur + marks);
    }
    if (i === turns.length - 1) lastTurnComplete = turn.darts.length >= 3;
  }

  const players_out = order.map((id) => {
    const st = ps.get(id)!;
    st.closedAll = targets.every((t) => (st.marks[t] ?? 0) >= 3);
    return st;
  });
  const deadTargets = targets.filter((t) => players_out.every((p) => (p.marks[t] ?? 0) >= 3));

  const { currentPlayerId, dartsThrownThisTurn } = turnCursor(turns, order, lastTurnComplete);
  const round = currentPlayerId ? roundFor(turns, order, currentPlayerId, lastTurnComplete) : 1;

  return {
    currentPlayerId,
    round,
    dartsThrownThisTurn,
    finished: winnerId !== null,
    winnerId,
    targets,
    deadTargets,
    players: players_out,
  };
}
```

- [ ] **Step 5: Tests + Typecheck**

Run: `cd server && npx vitest run && npx tsc --noEmit`
Expected: PASS, kein Typfehler.

- [ ] **Step 6: Commit**

```bash
git add server/src/engine/
git commit -m "Engine Cricket: Marks-Akkumulation (ohne Punkte)"
```

---

### Task 3: Cricket — Standard-Punkte + tote Zahlen

Overflow-Marks (über 3 hinaus) punkten für den Werfer, **solange mindestens ein Gegner
das Ziel noch nicht zu hat**. Ist es von allen zu (tot), gibt es keine Punkte.

**Files:**
- Modify: `server/src/engine/cricket.ts`
- Test: `server/src/engine/__tests__/cricket.test.ts`

**Interfaces:** unverändert (`computeCricketState`).

- [ ] **Step 1: Failing tests ergänzen**

In `cricket.test.ts` anfügen:
```ts
const scoreOf = (s: ReturnType<typeof computeCricketState>, id: string) =>
  s.players.find(p => p.playerId === id)!.score;

describe('computeCricketState — Standard-Punkte', () => {
  it('Overflow punktet, wenn Gegner offen ist', () => {
    // A: T20 (zu) + T20 (3 Overflow-Marks * 20 = 60), B hat 20 offen
    const s = computeCricketState(OPTS, PLAYERS, [d('a',20,3), d('a',20,3)]);
    expect(scoreOf(s, 'a')).toBe(60);
  });
  it('kein Overflow-Punkt beim Schließen selbst', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a',20,3)]);
    expect(scoreOf(s, 'a')).toBe(0);
  });
  it('tote Zahl gibt keine Punkte', () => {
    // A schließt 20, B schließt 20 -> 20 tot; A wirft nochmal 20 -> 0 Punkte
    const s = computeCricketState(OPTS, PLAYERS, [
      d('a',20,3), d('a',1,0),            // A: 20 zu (Dart 2 = Miss, segment 1 mult 0)
      d('b',20,3), d('b',1,0),            // B: 20 zu -> 20 ist tot
      d('a',20,3),                        // A: Overflow auf tote 20 -> keine Punkte
    ]);
    expect(s.deadTargets).toContain(20);
    expect(scoreOf(s, 'a')).toBe(0);
  });
  it('Bull-Overflow punktet 25', () => {
    // A: Bull innen (2) + Bull innen (2) => 4 Marks: 3 schließen, 1 Overflow * 25
    const s = computeCricketState(OPTS, PLAYERS, [d('a',25,2), d('a',25,2)]);
    expect(scoreOf(s, 'a')).toBe(25);
  });
});
```
*(Hinweis: `d('a',1,0)` ist ein Miss — `segment:1, multiplier:0` ergibt 0 Marks, dient
hier nur dazu, Darts im Zug „aufzufüllen".)*

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd server && npx vitest run src/engine/__tests__/cricket.test.ts`
Expected: FAIL — `score` bleibt 0 (Punkte noch nicht implementiert).

- [ ] **Step 3: Punkte-Logik in die Replay-Schleife einbauen**

In `cricket.ts` den inneren `for (const dart of turn.darts)`-Block ersetzen durch:
```ts
    for (const dart of turn.darts) {
      if (!targets.includes(dart.segment)) continue;
      const t = dart.segment;
      const value = t === 25 ? 25 : t;
      const marks = dart.multiplier;
      const cur = state.marks[t] ?? 0;
      const closing = Math.min(marks, 3 - cur);
      state.marks[t] = cur + closing;
      const overflow = marks - closing;
      if (overflow > 0) {
        const someOpponentOpen = order.some((id) => id !== turn.playerId && (ps.get(id)!.marks[t] ?? 0) < 3);
        if (options.mode === 'standard') {
          if (someOpponentOpen) state.score += overflow * value;
        } else {
          for (const id of order) {
            if (id === turn.playerId) continue;
            const opp = ps.get(id)!;
            if ((opp.marks[t] ?? 0) < 3) opp.score += overflow * value;
          }
        }
      }
    }
```

- [ ] **Step 4: Tests + Typecheck**

Run: `cd server && npx vitest run && npx tsc --noEmit`
Expected: PASS (Standard-Punkte-Tests grün; Cut-Throat-Test folgt in Task 4).

- [ ] **Step 5: Commit**

```bash
git add server/src/engine/
git commit -m "Engine Cricket: Standard-Punkte + tote Zahlen"
```

---

### Task 4: Cricket — Cut-Throat-Punkte

Im Cut-Throat gehen Overflow-Punkte an **jeden noch offenen Gegner** (wenig Punkte
gewinnt). Die Logik ist in Task 3 bereits im `else`-Zweig enthalten — hier nur der Test,
der sie festschreibt.

**Files:**
- Test: `server/src/engine/__tests__/cricket.test.ts`

**Interfaces:** keine Änderung.

- [ ] **Step 1: Failing/verifizierenden Test ergänzen**

In `cricket.test.ts` anfügen:
```ts
describe('computeCricketState — Cut-Throat', () => {
  const CT: CricketOptions = { mode: 'cutthroat', bull: true };
  const THREE: PlayerInput[] = [
    { id: 'a', name: 'A', order: 0 },
    { id: 'b', name: 'B', order: 1 },
    { id: 'c', name: 'C', order: 2 },
  ];
  it('Overflow gibt Punkte an alle offenen Gegner', () => {
    // A schließt 20 (T20) und wirft T20 Overflow (3*20=60) -> B und C je +60
    const s = computeCricketState(CT, THREE, [d('a',20,3), d('a',20,3)]);
    expect(s.players.find(p => p.playerId === 'a')!.score).toBe(0);
    expect(s.players.find(p => p.playerId === 'b')!.score).toBe(60);
    expect(s.players.find(p => p.playerId === 'c')!.score).toBe(60);
  });
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `cd server && npx vitest run src/engine/__tests__/cricket.test.ts`
Expected: PASS (bestätigt den in Task 3 gebauten Cut-Throat-Zweig).

- [ ] **Step 3: Commit**

```bash
git add server/src/engine/__tests__/cricket.test.ts
git commit -m "Engine Cricket: Cut-Throat-Punkte (Test)"
```

---

### Task 5: Cricket — Sieg-Erkennung

Standard: alle Ziele zu **und** Punkte ≥ Maximum. Cut-Throat: alle zu **und** Punkte ≤
Minimum. Der Sieg wird direkt nach dem auslösenden Dart erkannt.

**Files:**
- Modify: `server/src/engine/cricket.ts`
- Test: `server/src/engine/__tests__/cricket.test.ts`

**Interfaces:** unverändert.

- [ ] **Step 1: Failing tests ergänzen**

In `cricket.test.ts` anfügen:
```ts
describe('computeCricketState — Sieg', () => {
  it('Standard: alle zu und Punkte vorn = Sieg', () => {
    // A schließt alle Ziele (20..15 + Bull) und liegt bei Punkten nicht hinten
    const darts: PlayerDart[] = [];
    for (const t of [20,19,18,17,16,15]) darts.push(d('a', t, 3));
    darts.push(d('a', 25, 2)); // Bull: 2 Marks
    darts.push(d('a', 25, 2)); // Bull: +2 -> zu (>=3)
    const s = computeCricketState(OPTS, PLAYERS, darts);
    expect(s.players.find(p => p.playerId === 'a')!.closedAll).toBe(true);
    expect(s.finished).toBe(true);
    expect(s.winnerId).toBe('a');
    expect(s.currentPlayerId).toBe(null);
  });

  it('Standard: alle zu aber Gegner führt = noch kein Sieg', () => {
    // B macht erst Punkte (schließt 20, Overflow gegen offenes A), dann schließt A alles,
    // liegt aber Punkte-technisch hinten -> kein Sieg
    const darts: PlayerDart[] = [
      d('b',20,3), d('b',20,3), d('b',20,3),   // B: 20 zu + 6 Overflow-Marks*20 = 120 Punkte
      // A schließt nun alles:
      d('a',20,3), d('a',19,3), d('a',18,3),
      d('a',17,3), d('a',16,3), d('a',15,3),
      d('a',25,2), d('a',25,2),                // Bull zu
    ];
    const s = computeCricketState(OPTS, PLAYERS, darts);
    expect(s.players.find(p => p.playerId === 'a')!.closedAll).toBe(true);
    expect(s.finished).toBe(false); // A liegt bei Punkten hinten (0 < 120)
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd server && npx vitest run src/engine/__tests__/cricket.test.ts`
Expected: FAIL — Sieg wird nicht gesetzt.

- [ ] **Step 3: Sieg-Erkennung einbauen**

In `cricket.ts`:
1. Die Deklaration `const winnerId: string | null = null;` ersetzen durch
   `let winnerId: string | null = null;`.
2. Direkt **nach** dem inneren Dart-`for`-Block (aber noch innerhalb des Zug-`for`)
   die Sieg-Prüfung anfügen. Der Zug-Block sieht dann so aus:
```ts
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    const state = ps.get(turn.playerId);
    if (!state || winnerId) continue;

    for (const dart of turn.darts) {
      if (!targets.includes(dart.segment)) continue;
      const t = dart.segment;
      const value = t === 25 ? 25 : t;
      const marks = dart.multiplier;
      const cur = state.marks[t] ?? 0;
      const closing = Math.min(marks, 3 - cur);
      state.marks[t] = cur + closing;
      const overflow = marks - closing;
      if (overflow > 0) {
        const someOpponentOpen = order.some((id) => id !== turn.playerId && (ps.get(id)!.marks[t] ?? 0) < 3);
        if (options.mode === 'standard') {
          if (someOpponentOpen) state.score += overflow * value;
        } else {
          for (const id of order) {
            if (id === turn.playerId) continue;
            const opp = ps.get(id)!;
            if ((opp.marks[t] ?? 0) < 3) opp.score += overflow * value;
          }
        }
      }
      if (hasWon(options, state, ps, targets)) { winnerId = turn.playerId; break; }
    }

    if (i === turns.length - 1) lastTurnComplete = winnerId === turn.playerId || turn.darts.length >= 3;
  }
```
3. Die Hilfsfunktion `hasWon` am Dateiende (nach `computeCricketState`) ergänzen:
```ts
function hasWon(
  options: CricketOptions,
  player: CricketPlayerState,
  ps: Map<string, CricketPlayerState>,
  targets: number[],
): boolean {
  const closedAll = targets.every((t) => (player.marks[t] ?? 0) >= 3);
  if (!closedAll) return false;
  const scores = [...ps.values()].map((p) => p.score);
  return options.mode === 'standard'
    ? player.score >= Math.max(...scores)
    : player.score <= Math.min(...scores);
}
```

- [ ] **Step 4: Tests + Typecheck**

Run: `cd server && npx vitest run && npx tsc --noEmit`
Expected: PASS (alle Cricket-Tests grün), kein Typfehler.

- [ ] **Step 5: Commit**

```bash
git add server/src/engine/
git commit -m "Engine Cricket: Sieg-Erkennung (Standard + Cut-Throat)"
```

---

### Task 6: Around the Clock

Reihum `1 → … → 20 → Bull`. Treffer aufs aktuelle Ziel rückt vor; Double/Triple des
Ziels rücken 2/3 (per Option). Wer zuerst durch ist, gewinnt.

**Files:**
- Modify: `server/src/engine/types.ts`
- Create: `server/src/engine/atc.ts`
- Create: `server/src/engine/__tests__/atc.test.ts`

**Interfaces:**
- `AtcOptions { advanceByMultiplier: boolean }` (in `types.ts`).
- Produces:
  ```ts
  interface AtcPlayerState { playerId: string; progress: number; target: number | null; finished: boolean; }
  interface AtcState {
    currentPlayerId: string | null; round: number; dartsThrownThisTurn: number;
    finished: boolean; winnerId: string | null; sequence: number[]; players: AtcPlayerState[];
  }
  function computeAtcState(options: AtcOptions, players: PlayerInput[], darts: PlayerDart[]): AtcState
  ```
  `sequence = [1..20, 25]`. `progress` = Anzahl abgeschlossener Ziele (0..21).
  `target` = nächstes Ziel (`sequence[progress]`) oder `null` wenn fertig.

- [ ] **Step 1: `AtcOptions` in `types.ts` ergänzen**

Am Ende von `types.ts`:
```ts
export interface AtcOptions {
  advanceByMultiplier: boolean; // true: Double/Triple des Ziels rücken 2/3 vor
}
```

- [ ] **Step 2: Failing tests schreiben**

`server/src/engine/__tests__/atc.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeAtcState } from '../atc.js';
import type { PlayerInput, PlayerDart, AtcOptions } from '../types.js';

const OPTS: AtcOptions = { advanceByMultiplier: true };
const PLAYERS: PlayerInput[] = [
  { id: 'a', name: 'A', order: 0 },
  { id: 'b', name: 'B', order: 1 },
];
const d = (playerId: string, segment: number, multiplier: number): PlayerDart => ({ playerId, segment, multiplier });
const pa = (s: ReturnType<typeof computeAtcState>, id: string) => s.players.find(p => p.playerId === id)!;

describe('computeAtcState', () => {
  it('Start: Ziel ist 1, progress 0', () => {
    const s = computeAtcState(OPTS, PLAYERS, []);
    expect(pa(s, 'a').target).toBe(1);
    expect(pa(s, 'a').progress).toBe(0);
  });
  it('Treffer aufs Ziel rückt vor', () => {
    const s = computeAtcState(OPTS, PLAYERS, [d('a', 1, 1)]);
    expect(pa(s, 'a').progress).toBe(1);
    expect(pa(s, 'a').target).toBe(2);
  });
  it('falsche Zahl rückt nicht vor', () => {
    const s = computeAtcState(OPTS, PLAYERS, [d('a', 5, 1)]);
    expect(pa(s, 'a').progress).toBe(0);
  });
  it('Triple des Ziels rückt 3 vor (advanceByMultiplier)', () => {
    const s = computeAtcState(OPTS, PLAYERS, [d('a', 1, 3)]);
    expect(pa(s, 'a').progress).toBe(3);
    expect(pa(s, 'a').target).toBe(4);
  });
  it('ohne advanceByMultiplier rückt nur 1 vor', () => {
    const s = computeAtcState({ advanceByMultiplier: false }, PLAYERS, [d('a', 1, 3)]);
    expect(pa(s, 'a').progress).toBe(1);
  });
  it('Bull am Ende beendet -> Sieg', () => {
    const darts: PlayerDart[] = [];
    // 1..20 je Single (aber max 3 Darts/Zug -> Rotation nötig). Vereinfachung: nur A wirft,
    // Rotation ignoriert Reihenfolge nicht — daher fülle B-Züge mit Misses.
    let count = 0;
    const push = (seg: number, mult: number) => {
      darts.push(d('a', seg, mult)); count++;
      if (count % 3 === 0) { darts.push(d('b',0,0), d('b',0,0), d('b',0,0)); }
    };
    for (let n = 1; n <= 20; n++) push(n, 1);
    push(25, 1); // Bull -> fertig
    const s = computeAtcState(OPTS, PLAYERS, darts);
    expect(pa(s, 'a').finished).toBe(true);
    expect(s.winnerId).toBe('a');
    expect(s.finished).toBe(true);
  });
});
```

- [ ] **Step 3: Test laufen lassen — muss fehlschlagen**

Run: `cd server && npx vitest run src/engine/__tests__/atc.test.ts`
Expected: FAIL — `../atc.js` existiert nicht.

- [ ] **Step 4: `atc.ts` implementieren**

`server/src/engine/atc.ts`:
```ts
import type { AtcOptions, PlayerDart, PlayerInput } from './types.js';
import { groupTurns, turnCursor, roundFor } from './turns.js';

export interface AtcPlayerState {
  playerId: string;
  progress: number;      // 0..21 abgeschlossene Ziele
  target: number | null; // nächstes Ziel oder null
  finished: boolean;
}

export interface AtcState {
  currentPlayerId: string | null;
  round: number;
  dartsThrownThisTurn: number;
  finished: boolean;
  winnerId: string | null;
  sequence: number[];
  players: AtcPlayerState[];
}

const SEQUENCE = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25];

export function computeAtcState(
  options: AtcOptions,
  players: PlayerInput[],
  darts: PlayerDart[],
): AtcState {
  const order = [...players].sort((a, b) => a.order - b.order).map((p) => p.id);
  const progress = new Map<string, number>(players.map((p) => [p.id, 0]));

  const turns = groupTurns(darts);
  let winnerId: string | null = null;
  let lastTurnComplete = true;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    if (winnerId || !progress.has(turn.playerId)) continue;
    let prog = progress.get(turn.playerId)!;
    for (const dart of turn.darts) {
      const targetNumber = SEQUENCE[prog];
      if (targetNumber !== undefined && dart.segment === targetNumber && dart.multiplier > 0) {
        const step = options.advanceByMultiplier ? dart.multiplier : 1;
        prog = Math.min(SEQUENCE.length, prog + step);
      }
      if (prog >= SEQUENCE.length) { winnerId = turn.playerId; break; }
    }
    progress.set(turn.playerId, prog);
    if (i === turns.length - 1) lastTurnComplete = winnerId === turn.playerId || turn.darts.length >= 3;
  }

  const players_out: AtcPlayerState[] = order.map((id) => {
    const prog = progress.get(id)!;
    const finished = prog >= SEQUENCE.length;
    return { playerId: id, progress: prog, target: finished ? null : SEQUENCE[prog]!, finished };
  });

  if (winnerId) {
    return {
      currentPlayerId: null,
      round: Math.max(1, Math.ceil(turns.length / Math.max(1, order.length))),
      dartsThrownThisTurn: 0,
      finished: true,
      winnerId,
      sequence: SEQUENCE,
      players: players_out,
    };
  }
  const { currentPlayerId, dartsThrownThisTurn } = turnCursor(turns, order, lastTurnComplete);
  const round = currentPlayerId ? roundFor(turns, order, currentPlayerId, lastTurnComplete) : 1;
  return { currentPlayerId, round, dartsThrownThisTurn, finished: false, winnerId: null, sequence: SEQUENCE, players: players_out };
}
```

- [ ] **Step 5: Tests + Typecheck**

Run: `cd server && npx vitest run && npx tsc --noEmit`
Expected: PASS (alle Engine-Tests: score, turns, x01, cricket, atc), kein Typfehler.

- [ ] **Step 6: Commit**

```bash
git add server/src/engine/
git commit -m "Engine: Around the Clock"
```

---

## Self-Review

**Spec-Abdeckung (Design-Doc §6, §7a):**
- Cricket-Ziele 15–20 + Bull, Marks `╱/✕/Ⓧ` = 1/2/3 → `marks` 0..3 ✓ (Task 2)
- Standard-Punkte (Overflow) ✓ (Task 3); Cut-Throat ✓ (Task 4)
- Tote Zahl (alle zu → rot) → `deadTargets` ✓ (Task 3)
- Cricket-Sieg Standard/Cut-Throat ✓ (Task 5)
- ATC 1→20→Bull, Double/Triple rückt 2/3, Sieg ✓ (Task 6)
- Gemeinsame Zug-Logik (Rotation/Runde/Undo) → `turns.ts`, von allen genutzt ✓ (Task 1)

**Placeholder-Scan:** kein TBD/TODO; jeder Code-Schritt vollständig. ✓

**Typ-Konsistenz:** `CricketOptions`, `CricketState`, `CricketPlayerState`,
`AtcOptions`, `AtcState`, `AtcPlayerState` konsistent; `groupTurns`/`turnCursor`/
`roundFor` einheitlich aus `turns.ts`; `computeCricketState`/`computeAtcState`
spiegeln die `computeX01State`-Signatur `(options, players, darts)`. ✓

**Bekannte Vereinfachung:** `hasWon` prüft „≥ Max / ≤ Min" inkl. Gleichstand — bei
exaktem Punktgleichstand + alle zu gewinnt, wer zuerst schließt. Für den casual-Einsatz
ausreichend; ggf. später verfeinern.
