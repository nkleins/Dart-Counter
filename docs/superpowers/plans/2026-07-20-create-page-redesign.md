# Erstellungs-Seite Redesign (Hybrid) — Implementierungs-Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Match-Erstellungsseite in Karten mit Überschriften gliedern und die Detail-Optionen (Optionen, Format) in standardmäßig zugeklappte, einklappbare Bereiche stecken (Variante B / Hybrid).

**Architecture:** Eine neue kleine `Fold`-Komponente (kontrolliert, präsentational) kapselt das Auf-/Zuklappen. `GameOptionsPicker` wird in eine „Spiel"-Karte + „Optionen"-Fold + „Format"-Fold umgebaut; `CreatePage` bekommt eine „Spieler\*innen"-Karte. Der `onChange`-Vertrag des Pickers bleibt unverändert — Backend, „Modus wechseln" und Datenmodell bleiben unberührt.

**Tech Stack:** React + TypeScript (Vite), Vitest + @testing-library/react.

## Global Constraints

- **Eine Seite, kein Wizard.** Beide Folds starten **zugeklappt** (`defaultOpen = false`).
- **ATC hat keine Optionen** → der Optionen-Fold wird bei `gameType === 'aroundTheClock'` gar nicht gerendert.
- **`onChange(gameType, options)` bleibt exakt gleich** (inkl. `format`-Objekt); keine Änderung an Default-Werten (x01: 501 / Straight / Double; Cricket: Standard + Bull an; Format: Casual; Legs/Sets je 3).
- Summary-Texte exakt: Optionen x01 `501 · In Straight · Out Double`; Optionen Cricket `Standard · Bull an`; Format `Casual · Ein Leg` / `Single Set · Best of 3 Legs` / `Match · Best of 3 Sets · je 3 Legs`.
- Dunkles Bestands-Theme (Karte `var(--card)`, Amber-Eyebrow `var(--amber)`), Pill-Stil wie bisher.
- Sprache Deutsch. Commit: Autor = User, kein Co-Author-Trailer. **Kein Zwischen-Commit** — Spec + Plan + Code am Ende als ein Meilenstein.
- Web-Tests: `cd web && npx vitest run <datei>`; Typecheck: `cd web && npx tsc --noEmit`.

---

## File Structure

**Neu:**
- `web/src/components/Fold.tsx` — kontrollierte Klapp-Komponente (Label · Summary · Chevron; Inhalt nur wenn offen).
- `web/src/__tests__/Fold.test.tsx` — Toggle-/aria-Tests.

**Geändert:**
- `web/src/components/GameOptionsPicker.tsx` — Spiel-Karte + Optionen-Fold + Format-Fold, Summary-Strings.
- `web/src/pages/CreatePage.tsx` — Spieler\*innen-Bereich als Karte mit Eyebrow.
- `web/src/__tests__/CreatePage.test.tsx` — der Single-Set-Test klappt vorher den Format-Fold auf.

---

## Task 1: `Fold`-Komponente

**Files:**
- Create: `web/src/components/Fold.tsx`
- Test: `web/src/__tests__/Fold.test.tsx`

**Interfaces:**
- Produces: `Fold({ label: string; summary: string; defaultOpen?: boolean; children: React.ReactNode })` — Karte mit `<button>`-Kopfzeile (`aria-expanded`), Inhalt nur sichtbar wenn offen. `defaultOpen` Default `false`.

- [ ] **Step 1: Test schreiben**

`web/src/__tests__/Fold.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd web && npx vitest run src/__tests__/Fold.test.tsx`
Expected: FAIL („Cannot find module '../components/Fold.js'").

- [ ] **Step 3: `Fold` implementieren**

`web/src/components/Fold.tsx`:

```tsx
import { useState } from 'react';

/** Einklappbarer Karten-Bereich: Kopfzeile mit Label · Summary · Chevron, Inhalt bei Bedarf. */
export function Fold({ label, summary, defaultOpen = false, children }: {
  label: string; summary: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 12,
          background: 'none', border: 'none', color: 'var(--text)', textAlign: 'left' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--amber)' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, textAlign: 'right' }}>{summary}</span>
        <span aria-hidden style={{ color: 'var(--muted)', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>
      {open && <div style={{ padding: '0 12px 12px' }}>{children}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `cd web && npx vitest run src/__tests__/Fold.test.tsx`
Expected: PASS (3/3).

---

## Task 2: `GameOptionsPicker` auf Karte + Folds umbauen

**Files:**
- Modify: `web/src/components/GameOptionsPicker.tsx` (kompletter Render-Umbau)
- Modify: `web/src/__tests__/CreatePage.test.tsx:27-36` (Format-Fold vor der Auswahl aufklappen)

**Interfaces:**
- Consumes: `Fold` aus `./Fold.js`.
- Produces: unveränderter `onChange(gameType, options)`-Vertrag; Spieltyp-Kacheln sichtbar, Optionen/Format als zugeklappte Folds.

- [ ] **Step 1: Test anpassen (Format-Fold aufklappen)**

In `web/src/__tests__/CreatePage.test.tsx` den Single-Set-Test so ändern, dass zuerst der Format-Fold geöffnet wird (die Format-Kacheln liegen jetzt darin):

```tsx
  it('Format: Single Set zeigt Leg-Unter-Buttons und meldet legs im Format', () => {
    const onChange = vi.fn();
    const { getByText } = render(<GameOptionsPicker onChange={onChange} />);
    fireEvent.click(getByText('Format')); // Fold aufklappen
    fireEvent.click(getByText('Single Set'));
    fireEvent.click(getByText('7 Legs'));
    const last = onChange.mock.calls.at(-1)!;
    const opts = last[1] as { format: { kind: string; legs: number } };
    expect(opts.format).toEqual({ kind: 'singleSet', legs: 7 });
  });
```

(Der „Casual ist Default"-Test bleibt unverändert — `onChange` feuert beim Mount unabhängig vom Fold-Zustand.)

- [ ] **Step 2: Tests laufen lassen — Single-Set-Test muss fehlschlagen**

Run: `cd web && npx vitest run src/__tests__/CreatePage.test.tsx`
Expected: FAIL im Single-Set-Test (getByText('Format') findet noch die alte, immer sichtbare Format-Überschrift; nach Klick erscheinen die Kacheln bereits — der Test kann hier je nach Alt-Stand noch grün sein). Verbindliches Ziel ist Step 4 nach dem Umbau.

- [ ] **Step 3: `GameOptionsPicker.tsx` komplett ersetzen**

```tsx
import { useEffect, useState } from 'react';
import type { GameType, MatchFormat } from '../types.js';
import { Fold } from './Fold.js';

type InOut = 'straight' | 'double' | 'master';

const pill = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
  background: active ? 'var(--amber)' : 'var(--card)', color: active ? '#221803' : 'var(--text)',
  border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`, fontWeight: 700,
});
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 12, marginBottom: 12 };
const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 9 };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Auswahl von Spiel + Optionen + Format. Spiel als Karte; Optionen und Format als
 * standardmäßig zugeklappte Folds (Optionen entfällt bei Around the Clock). Meldet die
 * Konfiguration via `onChange` — genutzt beim Erstellen und beim „Modus wechseln".
 */
export function GameOptionsPicker({ onChange }: { onChange: (gameType: GameType, options: unknown) => void }) {
  const [gameType, setGameType] = useState<GameType>('x01');
  const [start, setStart] = useState<301 | 501 | 701>(501);
  const [inRule, setInRule] = useState<InOut>('straight');
  const [outRule, setOutRule] = useState<InOut>('double');
  const [cricketMode, setCricketMode] = useState<'standard' | 'cutthroat'>('standard');
  const [bull, setBull] = useState(true);
  const [formatKind, setFormatKind] = useState<MatchFormat['kind']>('casual');
  const [legs, setLegs] = useState<3 | 5 | 7>(3);
  const [sets, setSets] = useState<3 | 5 | 7>(3);

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

  const optionsSummary =
    gameType === 'x01' ? `${start} · In ${cap(inRule)} · Out ${cap(outRule)}` :
    `${cricketMode === 'standard' ? 'Standard' : 'Cut-Throat'} · Bull ${bull ? 'an' : 'aus'}`;
  const formatSummary =
    formatKind === 'singleSet' ? `Single Set · Best of ${legs} Legs` :
    formatKind === 'match' ? `Match · Best of ${sets} Sets · je ${legs} Legs` :
    'Casual · Ein Leg';

  return (
    <div>
      {/* Spiel */}
      <div style={card}>
        <div style={eyebrow}>Spiel</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {(['x01', 'cricket', 'aroundTheClock'] as GameType[]).map((g) => (
            <button key={g} style={pill(gameType === g)} onClick={() => setGameType(g)}>
              {g === 'x01' ? 'x01' : g === 'cricket' ? 'Cricket' : 'Around the Clock'}
            </button>
          ))}
        </div>
      </div>

      {/* Optionen — entfällt bei Around the Clock */}
      {gameType !== 'aroundTheClock' && (
        <Fold label="Optionen" summary={optionsSummary}>
          {gameType === 'x01' ? (
            <>
              <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
                {([301, 501, 701] as const).map((s) => <button key={s} style={pill(start === s)} onClick={() => setStart(s)}>{s}</button>)}
              </div>
              <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
                {(['straight', 'double', 'master'] as InOut[]).map((r) => <button key={r} style={pill(inRule === r)} onClick={() => setInRule(r)}>In: {r}</button>)}
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {(['straight', 'double', 'master'] as InOut[]).map((r) => <button key={r} style={pill(outRule === r)} onClick={() => setOutRule(r)}>Out: {r}</button>)}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button style={pill(cricketMode === 'standard')} onClick={() => setCricketMode('standard')}>Standard</button>
              <button style={pill(cricketMode === 'cutthroat')} onClick={() => setCricketMode('cutthroat')}>Cut-Throat</button>
              <button style={pill(bull)} onClick={() => setBull((b) => !b)}>Bull {bull ? 'an' : 'aus'}</button>
            </div>
          )}
        </Fold>
      )}

      {/* Format */}
      <Fold label="Format" summary={formatSummary}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: formatKind === 'casual' ? 0 : 10 }}>
          {([['casual', 'Casual'], ['singleSet', 'Single Set'], ['match', 'Match']] as [MatchFormat['kind'], string][]).map(([k, label]) => (
            <button key={k} style={pill(formatKind === k)} onClick={() => setFormatKind(k)}>{label}</button>
          ))}
        </div>
        {formatKind === 'match' && (
          <div style={{ display: 'flex', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--muted)' }}>Best of</span>
            {([3, 5, 7] as const).map((n) => <button key={n} style={pill(sets === n)} onClick={() => setSets(n)}>{n} Sets</button>)}
          </div>
        )}
        {(formatKind === 'singleSet' || formatKind === 'match') && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--muted)' }}>Best of</span>
            {([3, 5, 7] as const).map((n) => <button key={n} style={pill(legs === n)} onClick={() => setLegs(n)}>{n} Legs</button>)}
          </div>
        )}
      </Fold>
    </div>
  );
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd web && npx vitest run src/__tests__/CreatePage.test.tsx`
Expected: PASS (3/3 — Single Set nach Fold-Öffnung, Casual-Default, CreatePage-Flow).

---

## Task 3: `CreatePage` — Spieler\*innen-Karte

**Files:**
- Modify: `web/src/pages/CreatePage.tsx` (Spieler-Block in Karte mit Eyebrow)

**Interfaces:**
- Consumes: nichts Neues (nur Styling). Placeholder „Name hinzufügen…" und Button „+ Add" bleiben (der CreatePage-Test hängt daran).

- [ ] **Step 1: Spieler-Block umbauen**

In `web/src/pages/CreatePage.tsx` den bestehenden Spieler-`<div style={{ marginBottom: 20 }}>`-Block (Liste + Eingabe) durch eine Karte mit Eyebrow ersetzen. Die Karte nutzt `var(--card)`; damit die Spieler-Chips darin nicht mit dem Karten-Hintergrund verschmelzen, bekommen sie den dunkleren Eingabe-Hintergrund `#141922`:

```tsx
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 9 }}>Spieler*innen</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
          {players.map((p, i) => (
            <div key={i} style={{ background: '#141922', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', display: 'flex' }}>
              <span style={{ flex: 1 }}>{p}</span>
              <span style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => setPlayers((ps) => ps.filter((_, j) => j !== i))}>✕</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Name hinzufügen…" value={name} maxLength={14}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addPlayer(); }}
            style={{ flex: 1, background: '#141922', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', color: 'var(--text)' }} />
          <button onClick={addPlayer} style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '0 16px', fontWeight: 700 }}>+ Add</button>
        </div>
      </div>
```

- [ ] **Step 2: Volle Web-Suite + Typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: PASS überall, tsc 0 Fehler.

- [ ] **Step 3: Live-Check im Browser**

Web bauen, Server mit `STATIC_DIR` starten, Startseite `/` öffnen: prüfen, dass Spiel/Optionen/Format/Spieler\*innen als Karten erscheinen, Optionen+Format zugeklappt mit korrekter Summary, Aufklappen funktioniert, bei „Around the Clock" kein Optionen-Fold. (Server danach stoppen; keine `*.js`-Build-Artefakte committen.)

---

## Self-Review (durch den Autor geprüft)

**Spec-Abdeckung:** Struktur/Karten §2 → Task 2+3. Fold-Verhalten + Summaries §3 → Task 1+2. Defaults §4 → unverändert (Task 2 State-Init). Komponenten/Grenzen §5 → Task 1 (`Fold`), Task 2 (Picker, `onChange` unverändert), Task 3 (CreatePage). Tests §6 → Task 1 (Fold), Task 2 (Picker/Format-Fold), Task 3 (Suite+Live). ATC ohne Optionen-Fold → Task 2 (`gameType !== 'aroundTheClock'`). ✓

**Platzhalter:** keine; vollständiger Code in allen Code-Schritten.

**Typ-Konsistenz:** `Fold`-Props (`label`, `summary`, `defaultOpen`, `children`) identisch in Task 1 (Definition) und Task 2 (Nutzung). `onChange`-Signatur unverändert. Summary-Strings exakt wie in den Global Constraints.
