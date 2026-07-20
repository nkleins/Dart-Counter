# Match/Set/Leg-Formate + Miss-Indikator — Implementierungs-Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dem Miss-Button die Amber-Flash-Bestätigung geben und bei der Spielerstellung die Formate Casual / Single Set (Best-of-Legs) / Match (Best-of-Sets × Legs) für alle drei Spielarten ermöglichen.

**Architecture:** Ein neuer **reiner Match-Layer** (`server/src/engine/match.ts`) umschließt die bestehenden zustandslosen pro-Leg-Engines: er zerlegt das flache Wurf-Log per binärer Suche in Legs, rotiert die Start-Person je Leg, zählt Legs/Sets und ermittelt den Match-Sieger. Die pro-Leg-Regel-Engines (x01/cricket/atc) bleiben unangetastet. Das Format reist als `options.format`-Unterobjekt mit (keine DB-Migration).

**Tech Stack:** Node + TypeScript (Fastify, `node:sqlite`), React + TypeScript (Vite), Vitest.

## Global Constraints

- **Kein DB-Schema-Migration**: Format wird in `options` gespeichert, nicht als Spalte.
- **pro-Leg-Engines unverändert**: `computeX01State` / `computeCricketState` / `computeAtcState` und `turns.ts` werden NICHT geändert.
- **TDD**: Erst der fehlschlagende Test, dann Minimal-Implementierung.
- **Best-of N → erste*r auf `ceil(N/2)`**; N ∈ {3,5,7}.
- **Rotation**: Start-Person = Spielreihenfolge rotiert um `legIndex mod nSpieler`, durchgehend über Sets.
- **Spieler-Beitritt** ist nur bei `format.kind === 'casual'` erlaubt, sonst gesperrt (UI + Server).
- **Sprache**: UI-Texte & Kommentare Deutsch, passend zum Bestand.
- **Commits**: Autor bleibt der User (kein Co-Author-Trailer). Nachrichten auf Deutsch.
- Server-Tests laufen mit `cd server && npx vitest run <datei>`, Web-Tests mit `cd web && npx vitest run <datei>`.

---

## File Structure

**Neu:**
- `server/src/engine/match.ts` — Match-Layer (rein): Leg-Segmentierung, Rotation, Tally, Match-Sieger.
- `server/src/engine/__tests__/match.test.ts` — Tests des Match-Layers.
- `web/src/components/LegBanner.tsx` — kleines, nicht-modales „Leg an …"-Banner.

**Geändert:**
- `server/src/engine/types.ts` — `MatchFormat`, `MatchSummary` ergänzen.
- `server/src/api/games.ts` — `validGameConfig` (Format), `buildGameView` (Match-Layer + `match`-Feld), `GameView`-Interface.
- `server/src/api/play.ts` — Wurf/Status nach **Match**-Ende, Spieler-Beitritt-Sperre.
- `web/src/types.ts` — `MatchFormat`, `MatchSummary`, `GameView.match`.
- `web/src/components/Multiplier.tsx` — Miss-Flash.
- `web/src/components/Keypad.tsx` — `flash` an `Multiplier` durchreichen.
- `web/src/components/GameOptionsPicker.tsx` — Format-Auswahl mit Unter-Buttons.
- `web/src/components/TurnBar.tsx` — Set/Legs-Zähler.
- `web/src/pages/GamePage.tsx` — Leg-Banner + Match-Sieg-Verdrahtung, `match` an `TurnBar`.
- `web/src/components/HistoryTab.tsx` — Spieler-hinzufügen bei Set/Match sperren.

---

## Task 1: Miss-Button-Flash-Indikator

**Files:**
- Modify: `web/src/components/Multiplier.tsx`
- Modify: `web/src/components/Keypad.tsx:9-24,35-36`
- Test: `web/src/__tests__/Keypad.test.tsx`

**Interfaces:**
- Produces: `<Multiplier value miss={boolean} onChange />` — `Multiplier` bekommt ein neues Prop `miss` (true = Miss-Button aufblitzen lassen).

- [ ] **Step 1: Test schreiben — Miss-Button blitzt beim Klick auf**

Vorhandene Datei `web/src/__tests__/Keypad.test.tsx` lesen, um den Teststil (render/fireEvent/@testing-library) zu übernehmen, dann diesen Test ans Ende der bestehenden `describe`-Gruppe ergänzen:

```tsx
import { render, fireEvent } from '@testing-library/react';
// ... vorhandene Imports beibehalten

it('Miss-Button bekommt beim Antippen die Flash-Klasse', () => {
  const onThrow = vi.fn();
  const { getByText } = render(<Keypad onThrow={onThrow} />);
  const miss = getByText('Miss');
  fireEvent.click(miss);
  expect(miss.className).toContain('dart-flash');
  expect(onThrow).toHaveBeenCalledWith({ segment: 0, multiplier: 0 });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd web && npx vitest run src/__tests__/Keypad.test.tsx`
Expected: FAIL (Miss-Button hat noch keine `dart-flash`-Klasse).

- [ ] **Step 3: `Multiplier` um `miss`-Prop erweitern**

`web/src/components/Multiplier.tsx` — Signatur und Miss-Button anpassen:

```tsx
export type MulValue = 1 | 2 | 3 | 'miss';
export function Multiplier({ value, onChange, miss = false }: { value: MulValue; onChange: (v: MulValue) => void; miss?: boolean }) {
  const mults: { v: MulValue; label: string }[] = [
    { v: 1, label: 'Single' }, { v: 2, label: 'Double' }, { v: 3, label: 'Triple' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
      {/* Miss: kleine Version der antippbaren Board-Buttons, blitzt wie die Zahlen-Tasten auf. */}
      <button onClick={() => onChange('miss')} className={miss ? 'dart-flash' : undefined}
        style={{ height: 30, padding: '0 15px', borderRadius: 10, fontSize: 13, fontWeight: 700,
          ...(miss
            ? { background: 'var(--amber)', color: '#221803', border: '1px solid var(--amber)' }
            : { background: '#161f30', color: '#c5d0e0', border: '1px solid var(--border)' }) }}>
        Miss
      </button>
      <div style={{ display: 'flex', gap: 6 }}>
        {mults.map(({ v, label }) => {
          const on = value === v;
          return (
            <button key={label} onClick={() => onChange(v)}
              style={{ height: 25, padding: '0 11px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                background: on ? 'var(--amber)' : 'var(--card)', color: on ? '#221803' : '#c5d0e0',
                border: `1px solid ${on ? 'var(--amber)' : 'var(--border)'}` }}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `Keypad` das `miss`-Flag durchreichen**

`web/src/components/Keypad.tsx`, Zeile 36 (im `<div style={{ flex: 1 }}>`):

```tsx
        <div style={{ flex: 1 }}><Multiplier value={mul} onChange={onMul} miss={flash === 'miss'} /></div>
```

(`flash` und `onMul`/`fire('miss', …)` existieren bereits — `fire` setzt `flash='miss'` via `doFlash`.)

- [ ] **Step 5: Test laufen lassen — muss bestehen**

Run: `cd web && npx vitest run src/__tests__/Keypad.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/Multiplier.tsx web/src/components/Keypad.tsx web/src/__tests__/Keypad.test.tsx
git commit -m "Miss-Button: Amber-Flash beim Antippen wie die Zahlen-Tasten"
```

---

## Task 2: Format-Typen + Validierung

**Files:**
- Modify: `server/src/engine/types.ts` (ans Ende ergänzen)
- Modify: `web/src/types.ts` (ergänzen)
- Modify: `server/src/api/games.ts:13-28` (`validGameConfig`)
- Test: `server/src/__tests__/api-games.test.ts`

**Interfaces:**
- Produces (server, `engine/types.ts`):
  ```ts
  type MatchFormat =
    | { kind: 'casual' }
    | { kind: 'singleSet'; legs: 3 | 5 | 7 }
    | { kind: 'match'; sets: 3 | 5 | 7; legs: 3 | 5 | 7 };
  interface MatchSummary {
    format: MatchFormat;
    legsWon: Record<string, number>;
    setsWon: Record<string, number>;
    legNumber: number;
    setNumber: number;
    legWinnerId: string | null;
    matchWinnerId: string | null;
    finished: boolean;
  }
  ```
- Produces (server, `games.ts`): `validGameConfig` akzeptiert `options.format` (oder dessen Fehlen = casual).

- [ ] **Step 1: Test schreiben — Format-Validierung**

In `server/src/__tests__/api-games.test.ts` den vorhandenen Teststil (`app.inject`) ansehen und diese Tests in die passende `describe`-Gruppe ergänzen:

```ts
it('akzeptiert ein gültiges match-Format', async () => {
  const app = buildApp(openDb(':memory:'));
  const res = await app.inject({
    method: 'POST', url: '/api/games',
    payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'double', format: { kind: 'match', sets: 3, legs: 5 } }, players: ['A'] },
  });
  expect(res.statusCode).toBe(201);
  await app.close();
});

it('lehnt ein ungültiges Format ab (legs = 4)', async () => {
  const app = buildApp(openDb(':memory:'));
  const res = await app.inject({
    method: 'POST', url: '/api/games',
    payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'double', format: { kind: 'singleSet', legs: 4 } }, players: ['A'] },
  });
  expect(res.statusCode).toBe(400);
  await app.close();
});

it('fehlendes Format ist erlaubt (= casual)', async () => {
  const app = buildApp(openDb(':memory:'));
  const res = await app.inject({
    method: 'POST', url: '/api/games',
    payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'double' }, players: ['A'] },
  });
  expect(res.statusCode).toBe(201);
  await app.close();
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd server && npx vitest run src/__tests__/api-games.test.ts`
Expected: FAIL beim `legs = 4`-Fall (wird derzeit fälschlich akzeptiert, 201 statt 400).

- [ ] **Step 3: Typen ergänzen (server)**

Ans Ende von `server/src/engine/types.ts`:

```ts
export type MatchFormat =
  | { kind: 'casual' }
  | { kind: 'singleSet'; legs: 3 | 5 | 7 }
  | { kind: 'match'; sets: 3 | 5 | 7; legs: 3 | 5 | 7 };

export interface MatchSummary {
  format: MatchFormat;
  legsWon: Record<string, number>;   // im aktuellen Set
  setsWon: Record<string, number>;   // nur match-Modus relevant
  legNumber: number;                 // aktuelles Leg im Set (1-basiert)
  setNumber: number;                 // aktuelles Set (1-basiert)
  legWinnerId: string | null;        // nur an einer Leg-Grenze gesetzt
  matchWinnerId: string | null;      // Gesamtsieger
  finished: boolean;                 // Match beendet
}
```

- [ ] **Step 4: Typen ergänzen (web)**

Ans Ende von `web/src/types.ts` (vor `GameView`), und `GameView` um `match` erweitern:

```ts
export type MatchFormat =
  | { kind: 'casual' }
  | { kind: 'singleSet'; legs: 3 | 5 | 7 }
  | { kind: 'match'; sets: 3 | 5 | 7; legs: 3 | 5 | 7 };

export interface MatchSummary {
  format: MatchFormat;
  legsWon: Record<string, number>;
  setsWon: Record<string, number>;
  legNumber: number;
  setNumber: number;
  legWinnerId: string | null;
  matchWinnerId: string | null;
  finished: boolean;
}
```

Im `GameView`-Interface das Feld ergänzen (nach `state: AnyState;`):

```ts
  match: MatchSummary;
```

- [ ] **Step 5: `validGameConfig` um Format erweitern**

`server/src/api/games.ts`. Oben eine Helferfunktion + Konstante ergänzen (nach den vorhandenen `const CRICKET_MODES …`):

```ts
const BEST_OF = [3, 5, 7];

/** Validiert das optionale `options.format`. Fehlt es, gilt casual. */
function validFormat(format: unknown): boolean {
  if (format === undefined) return true;
  const f = format as Record<string, unknown>;
  switch (f.kind) {
    case 'casual': return true;
    case 'singleSet': return BEST_OF.includes(f.legs as number);
    case 'match': return BEST_OF.includes(f.sets as number) && BEST_OF.includes(f.legs as number);
    default: return false;
  }
}
```

In `validGameConfig` die Format-Prüfung mit einbeziehen — jede Rückgabe zusätzlich `&& validFormat(o.format)`:

```ts
export function validGameConfig(gameType: string, options: unknown): boolean {
  const o = (options ?? {}) as Record<string, unknown>;
  if (!validFormat(o.format)) return false;
  switch (gameType) {
    case 'x01':
      return X01_STARTS.includes(o.start as number) &&
        X01_IN_OUT.includes(o.in as X01InOut) &&
        X01_IN_OUT.includes(o.out as X01InOut);
    case 'cricket':
      return CRICKET_MODES.includes(o.mode as string);
    case 'aroundTheClock':
      return true;
    default:
      return false;
  }
}
```

- [ ] **Step 6: Tests laufen lassen — müssen bestehen**

Run: `cd server && npx vitest run src/__tests__/api-games.test.ts`
Expected: PASS. Zusätzlich Web-Typecheck: `cd web && npx tsc --noEmit` — Expected: FAIL nur dort, wo `GameView` konstruiert wird ohne `match` (wird in späteren Tasks/Test-Fixtures behoben); der Server-Test ist grün.

Hinweis: Falls `web/src/__tests__`-Fixtures `GameView`-Objekte ohne `match` bauen, werden diese in Task 6 (TurnBar/GamePage) mit angepasst. Für diesen Task zählt der grüne Server-Test.

- [ ] **Step 7: Commit**

```bash
git add server/src/engine/types.ts server/src/api/games.ts web/src/types.ts server/src/__tests__/api-games.test.ts
git commit -m "Format-Typen (MatchFormat/MatchSummary) + Server-Validierung"
```

---

## Task 3: Match-Layer-Engine (Kern)

**Files:**
- Create: `server/src/engine/match.ts`
- Test: `server/src/engine/__tests__/match.test.ts`

**Interfaces:**
- Consumes: `computeGameState(gameType, options, players, darts): GameStateResult` aus `engine/index.js`; `MatchFormat`/`MatchSummary` aus `engine/types.js`; `PlayerInput`/`PlayerDart` aus `engine/types.js`.
- Produces:
  ```ts
  function computeMatchState(
    gameType: GameType,
    options: unknown,          // enthält optional .format
    players: PlayerInput[],
    darts: PlayerDart[],
  ): { leg: GameStateResult; match: MatchSummary }
  ```
  `leg` = Zustand des aktuellen (bzw. finalen) Legs; `match` = Zähler/Sieger.

- [ ] **Step 1: Tests schreiben**

`server/src/engine/__tests__/match.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeMatchState } from '../match.js';
import type { PlayerInput, PlayerDart } from '../types.js';

const PLAYERS: PlayerInput[] = [
  { id: 'a', name: 'A', order: 0 },
  { id: 'b', name: 'B', order: 1 },
];
const d = (playerId: string, segment: number, multiplier: number): PlayerDart => ({ playerId, segment, multiplier });

// x01 mit Start 60, straight out: ein T20 (60) gewinnt ein Leg in EINEM Dart.
const X01 = (format: unknown) => ({ start: 60, in: 'straight', out: 'straight', format });
const win = (p: string) => d(p, 20, 3); // 60 -> Leg gewonnen

describe('computeMatchState — casual', () => {
  it('verhält sich wie ein einzelnes Leg', () => {
    const r = computeMatchState('x01', X01({ kind: 'casual' }), PLAYERS, [win('a')]);
    expect(r.match.finished).toBe(true);
    expect(r.match.matchWinnerId).toBe('a');
    expect(r.leg.state.winnerId).toBe('a');
  });

  it('leeres Spiel: A ist dran, nichts gewonnen', () => {
    const r = computeMatchState('x01', X01({ kind: 'casual' }), PLAYERS, []);
    expect(r.match.finished).toBe(false);
    expect(r.leg.state.currentPlayerId).toBe('a');
  });
});

describe('computeMatchState — singleSet Best of 3 Legs', () => {
  const F = { kind: 'singleSet', legs: 3 };

  it('nach einem gewonnenen Leg: Zähler 1:0, Banner an A, Match läuft weiter', () => {
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a')]);
    expect(r.match.legsWon).toEqual({ a: 1, b: 0 });
    expect(r.match.finished).toBe(false);
    expect(r.match.legWinnerId).toBe('a');       // an der Leg-Grenze
    // Leg 2 startet mit B (Rotation um 1)
    expect(r.leg.state.currentPlayerId).toBe('b');
  });

  it('Banner verschwindet, sobald im nächsten Leg geworfen wird', () => {
    // A gewinnt Leg 1, dann wirft B im Leg 2 einen (nicht gewinnenden) Dart.
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a'), d('b', 1, 1)]);
    expect(r.match.legWinnerId).toBe(null);
    expect(r.match.legsWon).toEqual({ a: 1, b: 0 });
  });

  it('erste*r auf 2 Legs gewinnt das Match (Rotation: Leg1 A-Start, Leg2 B-Start)', () => {
    // Leg 1: A gewinnt. Leg 2 startet B -> B soll auch hier gewinnen: also wirft B.
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a'), win('b'), win('a')]);
    // Leg1 A, Leg2 B, Leg3 (Start A) A -> A hat 2 Legs
    expect(r.match.legsWon).toEqual({ a: 2, b: 1 });
    expect(r.match.finished).toBe(true);
    expect(r.match.matchWinnerId).toBe('a');
    expect(r.match.legWinnerId).toBe(null); // bei Match-Ende kein Banner
  });
});

describe('computeMatchState — match Best of 3 Sets × Best of 3 Legs', () => {
  const F = { kind: 'match', sets: 3, legs: 3 };

  it('2 Legs gewinnen ein Set, danach werden legsWon zurückgesetzt', () => {
    // Set 1: Leg1 Start A -> A, Leg2 Start B -> A (A wirft), A hat 2 Legs -> Set an A
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a'), win('a')]);
    expect(r.match.setsWon).toEqual({ a: 1, b: 0 });
    expect(r.match.legsWon).toEqual({ a: 0, b: 0 }); // neues Set
    expect(r.match.finished).toBe(false);
  });

  it('2 Sets gewinnen das Match', () => {
    // Set1: A,A (2 Legs) ; Set2: A,A (2 Legs) -> A gewinnt Match
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a'), win('a'), win('a'), win('a')]);
    expect(r.match.setsWon).toEqual({ a: 2, b: 0 });
    expect(r.match.finished).toBe(true);
    expect(r.match.matchWinnerId).toBe('a');
  });
});

describe('computeMatchState — Undo über Leg-Grenze (reine Funktion)', () => {
  const F = { kind: 'singleSet', legs: 3 };
  it('Weglassen des Sieg-Darts macht das Leg wieder laufend', () => {
    const full = computeMatchState('x01', X01(F), PLAYERS, [win('a')]);
    expect(full.match.legsWon).toEqual({ a: 1, b: 0 });
    const undone = computeMatchState('x01', X01(F), PLAYERS, []);
    expect(undone.match.legsWon).toEqual({ a: 0, b: 0 });
    expect(undone.leg.state.currentPlayerId).toBe('a');
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd server && npx vitest run src/engine/__tests__/match.test.ts`
Expected: FAIL („Cannot find module '../match.js'").

- [ ] **Step 3: Match-Layer implementieren**

`server/src/engine/match.ts`:

```ts
import type { GameType, PlayerDart, PlayerInput, MatchFormat, MatchSummary } from './types.js';
import { computeGameState, type GameStateResult } from './index.js';

/** Liest ein gültiges Format aus den Optionen; fehlt/ungültig → casual. */
function readFormat(options: unknown): MatchFormat {
  const f = (options as { format?: unknown } | null | undefined)?.format as Record<string, unknown> | undefined;
  const ok = (n: unknown): n is 3 | 5 | 7 => n === 3 || n === 5 || n === 7;
  if (f?.kind === 'singleSet' && ok(f.legs)) return { kind: 'singleSet', legs: f.legs };
  if (f?.kind === 'match' && ok(f.sets) && ok(f.legs)) return { kind: 'match', sets: f.sets, legs: f.legs };
  return { kind: 'casual' };
}

/** Spielreihenfolge um `by` rotiert (order-Werte neu vergeben, damit Position `by` startet). */
function rotatePlayers(sorted: PlayerInput[], by: number): PlayerInput[] {
  const n = sorted.length;
  if (n === 0) return sorted;
  const k = ((by % n) + n) % n;
  return sorted.map((p, i) => ({ ...p, order: ((i - k) % n + n) % n }));
}

/**
 * Kleinste Dart-Anzahl k, mit der `slice[0..k]` das Leg beendet. `finished` ist
 * monoton in k (nach dem Sieg-Dart bleibt es true), daher binäre Suche.
 * Vorbedingung: das ganze `slice` beendet das Leg bereits.
 */
function legEnd(gameType: GameType, options: unknown, rotated: PlayerInput[], slice: PlayerDart[]): number {
  let lo = 1, hi = slice.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (computeGameState(gameType, options, rotated, slice.slice(0, mid)).state.finished) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

const legsToWin = (format: MatchFormat): number =>
  format.kind === 'casual' ? 1 : Math.ceil(format.legs / 2);
const setsToWin = (format: MatchFormat): number =>
  format.kind === 'match' ? Math.ceil(format.sets / 2) : 1;

export function computeMatchState(
  gameType: GameType,
  options: unknown,
  players: PlayerInput[],
  darts: PlayerDart[],
): { leg: GameStateResult; match: MatchSummary } {
  const format = readFormat(options);
  const sorted = [...players].sort((a, b) => a.order - b.order);
  const legsWon: Record<string, number> = {};
  const setsWon: Record<string, number> = {};
  for (const p of sorted) { legsWon[p.id] = 0; setsWon[p.id] = 0; }

  const needLegs = legsToWin(format);
  const needSets = setsToWin(format);

  let offset = 0;
  let legIndex = 0;              // globaler Leg-Zähler für die Rotation
  let matchWinnerId: string | null = null;
  let lastLegWinnerId: string | null = null;
  // Init: frisches Leg 1 (falls noch keine Würfe / nur bis zur Leg-Grenze gespielt).
  let leg: GameStateResult = computeGameState(gameType, options, rotatePlayers(sorted, 0), []);

  while (offset < darts.length && !matchWinnerId) {
    const rotated = rotatePlayers(sorted, legIndex);
    const slice = darts.slice(offset);
    const res = computeGameState(gameType, options, rotated, slice);
    if (!res.state.finished) { leg = res; lastLegWinnerId = null; break; } // laufendes Leg

    const w = res.state.winnerId as string;
    const consumed = legEnd(gameType, options, rotated, slice);
    legsWon[w] += 1;
    lastLegWinnerId = w;
    offset += consumed;
    legIndex += 1;

    if (format.kind === 'casual') {
      matchWinnerId = w;
    } else if (legsWon[w] >= needLegs) {
      if (format.kind === 'singleSet') {
        matchWinnerId = w;
      } else {
        setsWon[w] += 1;
        if (setsWon[w] >= needSets) matchWinnerId = w;
        else for (const p of sorted) legsWon[p.id] = 0; // neues Set
      }
    }

    if (matchWinnerId) {
      // Finales Leg als Board zeigen (die Aufnahme, die entschieden hat).
      leg = computeGameState(gameType, options, rotated, darts.slice(offset - consumed));
    }
  }

  // Zwischen zwei Legs (alle Darts verbraucht, Leg gewonnen, Match läuft): frisches
  // nächstes Leg zeigen + Banner (legWinnerId) setzen.
  if (!matchWinnerId && offset >= darts.length && lastLegWinnerId !== null) {
    leg = computeGameState(gameType, options, rotatePlayers(sorted, legIndex), []);
  }

  const finished = matchWinnerId !== null;
  const legsInSet = Object.values(legsWon).reduce((a, b) => a + b, 0);
  const setsPlayed = Object.values(setsWon).reduce((a, b) => a + b, 0);

  const match: MatchSummary = {
    format,
    legsWon,
    setsWon,
    legNumber: legsInSet + (finished ? 0 : 1),
    setNumber: setsPlayed + (finished && format.kind === 'match' ? 0 : 1),
    legWinnerId: finished ? null : lastLegWinnerId,
    matchWinnerId,
    finished,
  };
  return { leg, match };
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd server && npx vitest run src/engine/__tests__/match.test.ts`
Expected: PASS (alle).

- [ ] **Step 5: Commit**

```bash
git add server/src/engine/match.ts server/src/engine/__tests__/match.test.ts
git commit -m "Match-Layer: Leg-/Set-/Match-Logik über den zustandslosen Engines"
```

---

## Task 4: Match-Layer in die API einbinden

**Files:**
- Modify: `server/src/api/games.ts:41-85` (`GameView`-Interface + `buildGameView`)
- Modify: `server/src/api/play.ts:10-13,49-72,20-31` (`computeCurrent`, Wurf-/Status-Regeln, Beitritts-Sperre)
- Test: `server/src/__tests__/api-play.test.ts`

**Interfaces:**
- Consumes: `computeMatchState` aus `engine/match.js`; `readFormat`-Verhalten (casual als Default) implizit über `computeMatchState`.
- Produces: `GameView.match: MatchSummary`; Würfe/Status richten sich nach `match.finished`; `POST /players` → 409 bei laufendem Nicht-Casual-Spiel.

- [ ] **Step 1: Tests schreiben**

In `server/src/__tests__/api-play.test.ts` ergänzen:

```ts
it('Wurf nach beendetem LEG (aber laufendem Match) wird angenommen', async () => {
  const app = buildApp(openDb(':memory:'));
  const create = await app.inject({
    method: 'POST', url: '/api/games',
    payload: { gameType: 'x01', options: { start: 60, in: 'straight', out: 'straight', format: { kind: 'singleSet', legs: 3 } }, players: ['Mia', 'Ben'] },
  });
  const slug = create.json().slug;
  // Mia gewinnt Leg 1 mit T20 (60)
  const w1 = await app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment: 20, multiplier: 3 } });
  expect(w1.statusCode).toBe(200);
  expect(w1.json().match.legWinnerId).not.toBe(null);
  expect(w1.json().match.finished).toBe(false);
  // Nächster Wurf startet Leg 2 -> muss angenommen werden
  const w2 = await app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment: 1, multiplier: 1 } });
  expect(w2.statusCode).toBe(200);
  expect(w2.json().match.legWinnerId).toBe(null);
  await app.close();
});

it('Wurf nach beendetem MATCH -> 409', async () => {
  const app = buildApp(openDb(':memory:'));
  const create = await app.inject({
    method: 'POST', url: '/api/games',
    payload: { gameType: 'x01', options: { start: 60, in: 'straight', out: 'straight', format: { kind: 'singleSet', legs: 3 } }, players: ['Mia', 'Ben'] },
  });
  const slug = create.json().slug;
  const t20 = () => app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment: 20, multiplier: 3 } });
  await t20(); // Leg1 Mia (Start Mia)
  await t20(); // Leg2 (Start Ben) -> Ben wirft, Ben gewinnt Leg2
  await t20(); // Leg3 (Start Mia) -> Mia gewinnt Leg3 -> Mia 2 Legs -> Match aus
  const finished = await app.inject({ method: 'GET', url: `/api/games/${slug}` });
  expect(finished.json().match.finished).toBe(true);
  const extra = await t20();
  expect(extra.statusCode).toBe(409);
  await app.close();
});

it('Spieler-Beitritt im Set/Match-Modus -> 409', async () => {
  const app = buildApp(openDb(':memory:'));
  const create = await app.inject({
    method: 'POST', url: '/api/games',
    payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'straight', format: { kind: 'singleSet', legs: 3 } }, players: ['Mia', 'Ben'] },
  });
  const slug = create.json().slug;
  await app.inject({ method: 'POST', url: `/api/games/${slug}/throws`, payload: { segment: 1, multiplier: 1 } }); // running
  const join = await app.inject({ method: 'POST', url: `/api/games/${slug}/players`, payload: { name: 'Lena', catchUp: 'catchUp' } });
  expect(join.statusCode).toBe(409);
  await app.close();
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd server && npx vitest run src/__tests__/api-play.test.ts`
Expected: FAIL (`view.json().match` ist undefined; Beitritt liefert noch 201).

- [ ] **Step 3: `buildGameView` auf den Match-Layer umstellen**

`server/src/api/games.ts`. Import ergänzen (oben):

```ts
import { computeMatchState } from '../engine/match.js';
```

Im `GameView`-Interface nach `state: unknown;` ergänzen:

```ts
  match: import('../engine/types.js').MatchSummary;
```

(Alternativ oben `import type { MatchSummary } from '../engine/types.js';` und `match: MatchSummary;`.)

In `buildGameView` die Zustandsberechnung ersetzen: statt `computeGameState` nun `computeMatchState` verwenden und `match` zurückgeben. Die Zeile
```ts
const result = computeGameState(game.gameType, game.options, engineIn, darts);
```
ersetzen durch:
```ts
const { leg, match } = computeMatchState(game.gameType, game.options, engineIn, darts);
```
und im `return`-Objekt `state: result.state` ersetzen durch `state: leg.state, match,`. Der `computeGameState`-Import kann entfallen, falls sonst ungenutzt (sonst belassen).

- [ ] **Step 4: `play.ts` — Regeln auf Match-Ebene**

`server/src/api/play.ts`. `computeCurrent` auf den Match-Layer umstellen und Import anpassen:

```ts
import { computeMatchState } from '../engine/match.js';
```
```ts
function computeCurrent(db: DB, gameId: number, gameType: 'x01' | 'cricket' | 'aroundTheClock', options: unknown) {
  const { engineIn, darts } = toEngineInput(listPlayers(db, gameId), listThrows(db, gameId));
  return computeMatchState(gameType, options, engineIn, darts);
}
```

Damit liefert `computeCurrent` nun `{ leg, match }`. Alle Nutzungen anpassen:

**a) Beitritts-Sperre** in `POST /players` — direkt nach dem 400-Check für den Namen, vor `computeCurrent`:

```ts
const format = (game.options as { format?: { kind?: string } } | null)?.format;
if (game.status === 'running' && format && format.kind && format.kind !== 'casual') {
  return reply.code(409).send({ error: 'Im Set-/Match-Modus können keine Spieler*innen nachträglich beitreten.' });
}
```
Die vorhandene Zeile `const joinedAtRound = game.status === 'running' ? result.state.round : 0;` anpassen zu `result.leg.state.round` (Variable heißt weiterhin `result`):
```ts
const result = computeCurrent(db, game.id, game.gameType, game.options);
const joinedAtRound = game.status === 'running' ? result.leg.state.round : 0;
```

**b) `POST /throws`** — Block nur bei Match-Ende, Status bei Match-Ende:
```ts
const before = computeCurrent(db, game.id, game.gameType, game.options);
if (before.match.finished) return reply.code(409).send({ error: 'Match beendet' });
const current = before.leg.state.currentPlayerId;
```
und weiter unten:
```ts
const after = computeCurrent(db, game.id, game.gameType, game.options);
if (after.match.finished) setStatus(db, game.id, 'finished');
```

**c) `DELETE /players/:playerId`** und **`POST /undo`** — die Status-Herleitung nutzt `after.state.finished`; auf `after.match.finished` umstellen:
```ts
const after = computeCurrent(db, game.id, game.gameType, game.options);
setStatus(db, game.id, after.match.finished ? 'finished' : (listThrows(db, game.id).length > 0 ? 'running' : 'lobby'));
```
(an beiden Stellen identisch anwenden).

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `cd server && npx vitest run src/__tests__/api-play.test.ts src/__tests__/api-games.test.ts`
Expected: PASS. Danach die gesamte Server-Suite: `cd server && npx vitest run` — Expected: PASS (bestehende Tests greifen weiter, da `match` additiv ist und `state` unverändert bleibt).

- [ ] **Step 6: Commit**

```bash
git add server/src/api/games.ts server/src/api/play.ts server/src/__tests__/api-play.test.ts
git commit -m "API: Match-Layer einbinden (Wurf/Status auf Match-Ebene, Beitritts-Sperre)"
```

---

## Task 5: Format-Auswahl im GameOptionsPicker

**Files:**
- Modify: `web/src/components/GameOptionsPicker.tsx`
- Test: `web/src/__tests__/CreatePage.test.tsx`

**Interfaces:**
- Consumes: `MatchFormat` aus `../types.js`.
- Produces: `GameOptionsPicker` liefert `options.format` in jeder `onChange`-Meldung mit (Default `{ kind: 'casual' }`); progressive Unter-Buttons für Legs/Sets.

- [ ] **Step 1: Test schreiben**

`web/src/__tests__/CreatePage.test.tsx` ansehen (Testmuster) und einen Test ergänzen, der die progressive Anzeige prüft. Falls die Datei den Picker isoliert testet, direkt `GameOptionsPicker` rendern:

```tsx
import { render, fireEvent } from '@testing-library/react';
import { GameOptionsPicker } from '../components/GameOptionsPicker.js';

it('Format: Single Set zeigt Leg-Unter-Buttons und meldet legs im Format', () => {
  const onChange = vi.fn();
  const { getByText } = render(<GameOptionsPicker onChange={onChange} />);
  fireEvent.click(getByText('Single Set'));
  // Unter-Buttons erscheinen
  fireEvent.click(getByText('7 Legs'));
  const last = onChange.mock.calls.at(-1)!;
  const opts = last[1] as { format: { kind: string; legs: number } };
  expect(opts.format).toEqual({ kind: 'singleSet', legs: 7 });
});

it('Format: Casual ist Default', () => {
  const onChange = vi.fn();
  render(<GameOptionsPicker onChange={onChange} />);
  const first = onChange.mock.calls[0]!;
  expect((first[1] as { format: { kind: string } }).format).toEqual({ kind: 'casual' });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd web && npx vitest run src/__tests__/CreatePage.test.tsx`
Expected: FAIL („Single Set" nicht gefunden / `format` fehlt in options).

- [ ] **Step 3: Format-State + UI im Picker ergänzen**

`web/src/components/GameOptionsPicker.tsx`. Import ergänzen:
```ts
import type { GameType, MatchFormat } from '../types.js';
```
State ergänzen (bei den anderen `useState`):
```ts
  const [formatKind, setFormatKind] = useState<MatchFormat['kind']>('casual');
  const [legs, setLegs] = useState<3 | 5 | 7>(3);
  const [sets, setSets] = useState<3 | 5 | 7>(3);
```
Das `format`-Objekt in einem Memo/Ableitung bilden und in den `useEffect` einbeziehen. Den bestehenden `useEffect` ersetzen durch:
```ts
  useEffect(() => {
    const format: MatchFormat =
      formatKind === 'singleSet' ? { kind: 'singleSet', legs } :
      formatKind === 'match' ? { kind: 'match', sets, legs } :
      { kind: 'casual' };
    const options: unknown =
      gameType === 'x01' ? { start, in: inRule, out: outRule, format } :
      gameType === 'cricket' ? { mode: cricketMode, bull, format } :
      { advanceByMultiplier: true, format };
    onChange(gameType, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, start, inRule, outRule, cricketMode, bull, formatKind, legs, sets]);
```
Vor dem schließenden `</div>` des Pickers den Format-Abschnitt einfügen (nutzt die vorhandene `pill`-Hilfsfunktion):
```tsx
      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 9 }}>Format</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: formatKind === 'casual' ? 0 : 10 }}>
          {([['casual', 'Casual'], ['singleSet', 'Single Set'], ['match', 'Match']] as [MatchFormat['kind'], string][]).map(([k, label]) => (
            <button key={k} style={pill(formatKind === k)} onClick={() => setFormatKind(k)}>{label}</button>
          ))}
        </div>
        {(formatKind === 'singleSet' || formatKind === 'match') && (
          <div style={{ display: 'flex', gap: 7, marginBottom: formatKind === 'match' ? 8 : 0, flexWrap: 'wrap' }}>
            <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--muted)' }}>Best of</span>
            {([3, 5, 7] as const).map((n) => <button key={n} style={pill(legs === n)} onClick={() => setLegs(n)}>{n} Legs</button>)}
          </div>
        )}
        {formatKind === 'match' && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--muted)' }}>Best of</span>
            {([3, 5, 7] as const).map((n) => <button key={n} style={pill(sets === n)} onClick={() => setSets(n)}>{n} Sets</button>)}
          </div>
        )}
      </div>
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `cd web && npx vitest run src/__tests__/CreatePage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/GameOptionsPicker.tsx web/src/__tests__/CreatePage.test.tsx
git commit -m "Erstellen: Format-Auswahl (Casual/Single Set/Match) mit Unter-Buttons"
```

---

## Task 6: Set/Legs-Zähler in der TurnBar

**Files:**
- Modify: `web/src/components/TurnBar.tsx`
- Modify: `web/src/pages/GamePage.tsx:27` (TurnBar-Aufruf um `match`/`players` erweitern)
- Test: `web/src/__tests__/*` (neue Datei `web/src/__tests__/TurnBar.test.tsx`)

**Interfaces:**
- Consumes: `MatchSummary`, `PlayerMeta` aus `../types.js`.
- Produces: `<TurnBar name dartsThrownThisTurn dartsThisTurnTotal onUndo match players />` — neue Props `match: MatchSummary` und `players: PlayerMeta[]`; rendert den Zähler zwischen Name und „Dart x/3".

- [ ] **Step 1: Test schreiben**

`web/src/__tests__/TurnBar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TurnBar } from '../components/TurnBar.js';
import type { MatchSummary, PlayerMeta } from '../types.js';

const players: PlayerMeta[] = [
  { id: 'a', name: 'A', order: 0, joinedAtRound: 0, catchUp: 'handicap' },
  { id: 'b', name: 'B', order: 1, joinedAtRound: 0, catchUp: 'handicap' },
];
const base = { name: 'A', dartsThrownThisTurn: 0, dartsThisTurnTotal: 3, onUndo: vi.fn(), players };

describe('TurnBar — Zähler', () => {
  it('casual: kein Zähler', () => {
    const match: MatchSummary = { format: { kind: 'casual' }, legsWon: { a: 0, b: 0 }, setsWon: { a: 0, b: 0 }, legNumber: 1, setNumber: 1, legWinnerId: null, matchWinnerId: null, finished: false };
    const { queryByText } = render(<TurnBar {...base} match={match} />);
    expect(queryByText(/Legs/)).toBe(null);
  });

  it('singleSet: zeigt Legs-Stand', () => {
    const match: MatchSummary = { format: { kind: 'singleSet', legs: 3 }, legsWon: { a: 2, b: 1 }, setsWon: { a: 0, b: 0 }, legNumber: 4, setNumber: 1, legWinnerId: null, matchWinnerId: null, finished: false };
    const { getByText } = render(<TurnBar {...base} match={match} />);
    expect(getByText(/Legs\s+2.1/)).toBeTruthy();
  });

  it('match: zeigt Sets und Legs', () => {
    const match: MatchSummary = { format: { kind: 'match', sets: 3, legs: 3 }, legsWon: { a: 1, b: 0 }, setsWon: { a: 1, b: 0 }, legNumber: 2, setNumber: 2, legWinnerId: null, matchWinnerId: null, finished: false };
    const { getByText } = render(<TurnBar {...base} match={match} />);
    expect(getByText(/Sets\s+1.0/)).toBeTruthy();
    expect(getByText(/Legs\s+1.0/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd web && npx vitest run src/__tests__/TurnBar.test.tsx`
Expected: FAIL (TurnBar akzeptiert `match`/`players` noch nicht; Zähler fehlt).

- [ ] **Step 3: TurnBar erweitern**

`web/src/components/TurnBar.tsx` komplett ersetzen:

```tsx
import type { MatchSummary, PlayerMeta } from '../types.js';

/** Kompakte Zahlenreihe in Sitzreihenfolge, z. B. "2·1·0" bzw. "2–1" bei zwei Personen. */
function tally(players: PlayerMeta[], won: Record<string, number>): string {
  const nums = players.map((p) => won[p.id] ?? 0);
  return nums.length === 2 ? `${nums[0]}–${nums[1]}` : nums.join('·');
}

export function TurnBar({ name, dartsThrownThisTurn, dartsThisTurnTotal, onUndo, match, players }: {
  name: string; dartsThrownThisTurn: number; dartsThisTurnTotal: number; onUndo: () => void;
  match: MatchSummary; players: PlayerMeta[];
}) {
  const total = dartsThisTurnTotal || 3;
  const catchUp = total > 3;
  const showCounter = match.format.kind !== 'casual';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--amber)' }} />
      <span style={{ fontSize: 16, fontWeight: 700 }}><b style={{ color: 'var(--amber)' }}>{name}</b> ist dran</span>
      {showCounter && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10, fontSize: 12, color: 'var(--muted)' }}>
          {match.format.kind === 'match' && (
            <span>Sets <b style={{ color: 'var(--text)' }}>{tally(players, match.setsWon)}</b></span>
          )}
          <span>Legs <b style={{ color: 'var(--text)' }}>{tally(players, match.legsWon)}</b></span>
        </span>
      )}
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button aria-label="Zurück" onClick={onUndo} style={{ width: 32, height: 31, borderRadius: 9, background: '#1c222d', border: '1px solid #2f3745', color: '#aeb8c8' }}>↶</button>
        <span style={{ fontSize: 12, color: catchUp ? 'var(--amber)' : 'var(--muted)' }}>
          {catchUp ? 'Aufholen ' : 'Dart '}{Math.min(dartsThrownThisTurn + 1, total)} / {total}
        </span>
      </span>
    </div>
  );
}
```

- [ ] **Step 4: GamePage-Aufruf anpassen**

`web/src/pages/GamePage.tsx`, den `<TurnBar … />`-Aufruf (Zeile ~27) erweitern:

```tsx
      <TurnBar name={nameOf(view.state.currentPlayerId)} dartsThrownThisTurn={view.state.dartsThrownThisTurn} dartsThisTurnTotal={view.state.dartsThisTurnTotal} onUndo={undo} match={view.match} players={view.players} />
```

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `cd web && npx vitest run src/__tests__/TurnBar.test.tsx`
Expected: PASS. Falls bestehende Tests `GameView`-Fixtures ohne `match` bauen und dadurch der Typecheck/Render bricht: in jenen Fixtures `match: { format: { kind: 'casual' }, legsWon: {}, setsWon: {}, legNumber: 1, setNumber: 1, legWinnerId: null, matchWinnerId: null, finished: false }` ergänzen. Dann `cd web && npx vitest run`.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/TurnBar.tsx web/src/pages/GamePage.tsx web/src/__tests__/TurnBar.test.tsx
git commit -m "TurnBar: Set/Legs-Zähler zwischen Name und Wurf-Anzeige"
```

---

## Task 7: Leg-Banner + Match-Sieg-Verdrahtung in der GamePage

**Files:**
- Create: `web/src/components/LegBanner.tsx`
- Modify: `web/src/pages/GamePage.tsx:19,42-56`
- Test: `web/src/__tests__/GamePage.test.tsx`

**Interfaces:**
- Consumes: `view.match` (`legWinnerId`, `matchWinnerId`, `finished`, `legsWon`).
- Produces: `<LegBanner winnerName legsText />`; WinPopup/FinishActions feuern nur bei `match.finished`.

- [ ] **Step 1: Test schreiben**

`web/src/__tests__/GamePage.test.tsx` ansehen (wie dort `useGame` gemockt/`view` gesetzt wird) und die Fälle ergänzen. Kern-Assertions:

```tsx
// Bei laufendem Match mit gerade gewonnenem Leg: Banner sichtbar, KEIN WinPopup.
it('zeigt das Leg-Banner zwischen den Legs', () => {
  // view mit match.legWinnerId = 'a', match.finished = false, state.finished = false rendern
  // -> Text "Leg an" erscheint, "gewinnt!" (WinPopup) nicht.
});

// Bei match.finished: WinPopup mit Match-Sieger.
it('zeigt das WinPopup erst bei Match-Ende', () => {
  // view mit match.finished = true, match.matchWinnerId = 'a'
  // -> "A gewinnt!" erscheint.
});
```

Die konkreten `view`-Objekte am vorhandenen Fixture-Stil der Datei orientieren (dieselbe `match`-Struktur wie in Task 6). Falls die Datei noch keine `useGame`-Mocks hat, den vorhandenen Render-Aufbau übernehmen und nur `view.match` variieren.

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd web && npx vitest run src/__tests__/GamePage.test.tsx`
Expected: FAIL (Banner existiert nicht; WinPopup feuert noch an `state`).

- [ ] **Step 3: LegBanner-Komponente**

`web/src/components/LegBanner.tsx`:

```tsx
export function LegBanner({ winnerName, legsText }: { winnerName: string; legsText: string }) {
  return (
    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
      background: '#14251b', border: '1px solid #274b33' }}>
      <span style={{ fontSize: 18 }}>🎯</span>
      <span style={{ fontWeight: 700 }}>Leg an <b style={{ color: 'var(--amber)' }}>{winnerName}</b></span>
      <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{legsText}</span>
    </div>
  );
}
```

- [ ] **Step 4: GamePage auf Match-Ebene umstellen**

`web/src/pages/GamePage.tsx`. Import ergänzen:
```tsx
import { LegBanner } from '../components/LegBanner.js';
```
Die drei `view.state.finished && view.state.winnerId`-Blöcke (Zeile ~42–56) ersetzen durch match-basierte Logik:

```tsx
      {view.match.legWinnerId && !view.match.finished && (
        <LegBanner
          winnerName={nameOf(view.match.legWinnerId)}
          legsText={`Legs ${view.players.map((p) => view.match.legsWon[p.id] ?? 0).join(view.players.length === 2 ? '–' : '·')}`}
        />
      )}

      {view.match.finished && view.match.matchWinnerId && (
        <FinishActions
          onRestart={() => { setShowWin(true); setTab('board'); reset(); }}
          onChangeMode={(gameType: GameType, options: unknown) => { setShowWin(true); setTab('board'); reset({ gameType, options }); }}
          onHome={() => nav('/')}
        />
      )}

      {view.match.finished && view.match.matchWinnerId && showWin && (
        <WinPopup
          winnerName={nameOf(view.match.matchWinnerId)}
          onUndo={() => { setShowWin(true); undo(); }}
          onClose={() => setShowWin(false)}
        />
      )}
```

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `cd web && npx vitest run src/__tests__/GamePage.test.tsx`
Expected: PASS. Danach die gesamte Web-Suite: `cd web && npx vitest run` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/LegBanner.tsx web/src/pages/GamePage.tsx web/src/__tests__/GamePage.test.tsx
git commit -m "GamePage: Leg-Banner zwischen Legs, WinPopup erst bei Match-Ende"
```

---

## Task 8: Spieler-Beitritt im Set/Match-Modus in der UI sperren

**Files:**
- Modify: `web/src/components/HistoryTab.tsx:11-13,43-64`
- Test: `web/src/__tests__/*` (in vorhandene HistoryTab-Abdeckung oder neue `HistoryTab.test.tsx`)

**Interfaces:**
- Consumes: `view.match.format.kind`.
- Produces: Eingabe „Name hinzufügen" ist bei laufendem Nicht-Casual-Spiel deaktiviert + Hinweistext.

- [ ] **Step 1: Test schreiben**

`web/src/__tests__/HistoryTab.test.tsx` (oder in vorhandene Datei einfügen):

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HistoryTab } from '../components/HistoryTab.js';
import type { GameView } from '../types.js';

const casualMatch = { format: { kind: 'casual' as const }, legsWon: {}, setsWon: {}, legNumber: 1, setNumber: 1, legWinnerId: null, matchWinnerId: null, finished: false };

function view(kind: 'casual' | 'singleSet', status: GameView['status']): GameView {
  return {
    slug: 's', gameType: 'x01', options: {}, status, createdAt: 0, expiresAt: 0,
    players: [{ id: 'a', name: 'A', order: 0, joinedAtRound: 0, catchUp: 'handicap' }],
    state: { currentPlayerId: 'a', round: 1, dartsThrownThisTurn: 0, dartsThisTurnTotal: 3, finished: false, winnerId: null, players: [], checkout: null } as GameView['state'],
    history: [],
    match: kind === 'casual' ? casualMatch : { ...casualMatch, format: { kind: 'singleSet', legs: 3 } },
  };
}
const noop = () => {};

describe('HistoryTab — Beitritts-Sperre', () => {
  it('Single Set + running: Name-Eingabe ist deaktiviert', () => {
    const { getByPlaceholderText } = render(<HistoryTab view={view('singleSet', 'running')} onJoin={noop} onRemove={noop} onExtend={noop} onHome={noop} />);
    expect((getByPlaceholderText('Name…') as HTMLInputElement).disabled).toBe(true);
  });
  it('Casual + running: Name-Eingabe ist aktiv', () => {
    const { getByPlaceholderText } = render(<HistoryTab view={view('casual', 'running')} onJoin={noop} onRemove={noop} onExtend={noop} onHome={noop} />);
    expect((getByPlaceholderText('Name…') as HTMLInputElement).disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd web && npx vitest run src/__tests__/HistoryTab.test.tsx`
Expected: FAIL (Eingabe nicht deaktiviert).

- [ ] **Step 3: HistoryTab sperren**

`web/src/components/HistoryTab.tsx`. Nach `const running = view.status === 'running';` ergänzen:
```ts
  const joinLocked = running && view.match.format.kind !== 'casual';
```
Die Eingabe + Add-Button + catchUp-Reihe abhängig machen. Den Eingabe-Block (`<div style={{ display: 'flex', gap: 8 }}> … </div>`) ersetzen durch:
```tsx
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Name…" value={name} maxLength={14} disabled={joinLocked}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            style={{ flex: 1, background: '#141922', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', color: 'var(--text)', opacity: joinLocked ? 0.5 : 1 }} />
          <button onClick={add} disabled={joinLocked} style={{ ...chip, padding: '0 16px', opacity: joinLocked ? 0.5 : 1 }}>+ Add</button>
        </div>
        {joinLocked && (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0' }}>Im Set-/Match-Modus können keine Spieler*innen nachträglich beitreten.</p>
        )}
```
Die catchUp-Auswahl-Reihe zusätzlich an `!joinLocked` binden: `{running && !joinLocked && ( … )}`.

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd web && npx vitest run src/__tests__/HistoryTab.test.tsx`
Expected: PASS.

- [ ] **Step 5: Gesamt-Suite + Typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Run: `cd server && npx vitest run && npx tsc --noEmit`
Expected: PASS überall.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/HistoryTab.tsx web/src/__tests__/HistoryTab.test.tsx
git commit -m "HistoryTab: Spieler-Beitritt im Set-/Match-Modus sperren"
```

---

## Self-Review (durch den Autor geprüft)

**Spec-Abdeckung:**
- Miss-Indikator → Task 1. ✓
- Format-Modell (`options.format`, casual/singleSet/match) → Task 2. ✓
- Match-Layer (Segmentierung, Rotation, Tally, Sieger, binäre Suche, legWinnerId-Transienz) → Task 3. ✓
- API (Validierung, `match` in GameView, Wurf/Status auf Match-Ebene, Beitritts-409) → Task 2 + 4. ✓
- Picker mit progressiven Unter-Buttons → Task 5. ✓
- Set/Legs-Zähler in TurnBar (zwischen Name und Wurf-Anzeige) → Task 6. ✓
- Leg-Banner (kein Konfetti) + Match-Sieg-WinPopup → Task 7. ✓
- Spieler-Sperre UI → Task 8 (Server in Task 4). ✓
- Alle drei Spielarten → Match-Layer ist spielart-agnostisch (nutzt `computeGameState`), Format in `options` für alle. ✓
- Tests (Match-Layer, API, Komponenten) → jeweils in den Tasks. ✓

**Typ-Konsistenz:** `MatchFormat`/`MatchSummary` identisch in `server/src/engine/types.ts` und `web/src/types.ts`; `computeMatchState` liefert `{ leg, match }`, konsistent in `buildGameView` und `computeCurrent` verwendet; `TurnBar`-Props (`match`, `players`) konsistent mit GamePage-Aufruf.

**Platzhalter:** keine offenen TODO/TBD; Code in allen Code-Schritten vollständig. (Task 7 Step 1 beschreibt die Test-`view`-Fixtures bewusst am vorhandenen Dateistil, da deren genaue Mock-Struktur erst beim Öffnen der Datei feststeht — die Assertions sind konkret.)

**Bekannte Grenzen:** Mitten-im-Spiel-Beitritt nur casual (per Design); Rotation rein legbasiert.
