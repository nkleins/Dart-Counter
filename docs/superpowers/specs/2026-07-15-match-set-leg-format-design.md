# Match / Set / Leg-Formate + Miss-Indikator — Design-Dokument

**Datum:** 2026-07-15
**Status:** In Abstimmung

## 1. Zweck

Zwei Erweiterungen der Dart-App:

1. **Miss-Button-Indikator** — der „Miss"-Button bekommt beim Antippen dasselbe
   kurze Amber-Aufblitzen wie die Zahlen-Tasten (visuelle Bestätigung).
2. **Spielformate** — bei der Spielerstellung wählbar:
   - **Casual** — ein einzelnes Leg, ohne Best-of (Verhalten wie bisher).
   - **Single Set** — Best of 3 / 5 / 7 **Legs**.
   - **Match** — Best of 3 / 5 / 7 **Sets**, wobei jedes Set Best of 3 / 5 / 7 **Legs** ist.

   Gilt für **alle drei Spielarten** (x01, Cricket, Around the Clock). Ein „Leg" ist
   dabei ein vollständiges Spiel der jeweiligen Art (volles Cricket-Board, volles
   ATC-Rennen).

Damit kehrt die App eine bewusste v1-YAGNI-Entscheidung um (§2 des ursprünglichen
Design-Dokuments: „keine Legs/Sets/Best-of"). Die restliche Architektur (zustandslose
Engine, Event-Log als Source of Truth) bleibt unverändert und trägt das Feature.

## 2. Format-Modell

Das Format ist **orthogonal zur Spielart** und wird als klar benannter Unter-Block
im bestehenden `options`-JSON transportiert:

```ts
type MatchFormat =
  | { kind: 'casual' }                                  // ein Leg
  | { kind: 'singleSet'; legs: 3 | 5 | 7 }              // Best-of Legs
  | { kind: 'match'; sets: 3 | 5 | 7; legs: 3 | 5 | 7 } // Best-of Sets, je Set Best-of Legs
```

„Best of N" → **erste*r auf `ceil(N/2)`** gewinnt (3→2, 5→3, 7→4). Alle N sind
ungerade → keine Unentschieden.

**Warum in `options` statt eigene Spalte?**
- Kein DB-Schema-Migration nötig (`db.ts` legt Tabellen nur per `CREATE TABLE IF NOT
  EXISTS` an, es gibt kein Migrations-Framework; Spiele löschen sich nach 24 h ohnehin).
- `options` ist bereits ein opaker JSON-Blob, der sauber durch Erstellen / Reset /
  „Modus wechseln" fließt — Format profitiert davon (z. B. Casual → Match beim
  Moduswechsel „einfach so" möglich).
- Die pro-Leg-Engines lesen nur ihre eigenen Keys (`start/in/out`, `mode/bull`) und
  **ignorieren** `format` folgenlos. Nur Validierung und der neue Match-Layer lesen es.

Fehlt `options.format` (Altbestand), gilt implizit `{ kind: 'casual' }`.

## 3. Engine: reiner „Match-Layer"

Kern des Features. **Ein neues reines Modul** `server/src/engine/match.ts` umschließt
die bestehenden pro-Leg-Engines — **ohne jede Änderung an den x01-/Cricket-/ATC-Regeln**.

### Segmentierung des Wurf-Logs in Legs

Die Engines sind zustandslos und rechnen aus der flachen Wurfliste. Der Match-Layer
zerlegt diese Liste Leg für Leg:

```
offset = 0
legIndex = 0
für jedes Leg:
  rotierteReihenfolge = Spieler-order um (legIndex mod nSpieler) rotiert
  slice = darts.slice(offset)
  legState = computeGameState(gameType, options, rotierteSpieler, slice)
  wenn legState NICHT finished:
      → das ist das aktuelle (laufende) Leg. Board rendert daraus. Abbruch.
  sonst:
      dartsConsumed = binäre Suche über k∈[1..slice.length]:
                       kleinstes k mit computeGameState(..., slice[0..k]).finished
      Tally: legsWon[winner] += 1
      Set-/Match-Fortschritt prüfen (siehe unten)
      offset += dartsConsumed; legIndex += 1
      wenn Match entschieden → Abbruch
```

**Warum binäre Suche statt Engine-Änderung?** Das `finished`-Prädikat ist monoton in
k (ab dem siegbringenden Dart bleibt es `true`, spätere Darts des nächsten Legs
ignoriert die Engine nach dem Sieg). So findet eine binäre Suche die exakte
Leg-Grenze, **ohne** die pro-Leg-Engines um ein `dartsConsumed`-Feld zu erweitern.
Datenmengen sind winzig (max. einige hundert Darts), Kosten vernachlässigbar.
Trade-off: O(log n) Engine-Läufe pro Leg statt einem — bewusst zugunsten der
Isolation (Regel-Engines bleiben unangetastet).

**Warum Rotation über `order` funktioniert:** `groupTurns` bildet Züge aus
aufeinanderfolgenden Darts derselben Person; die Slice-Grenze pro Leg verhindert, dass
der Sieg-Dart eines Legs mit dem ersten Dart des nächsten Legs verschmilzt. `order`
bestimmt via `turnCursor` nur, wer als Nächstes/Erstes dran ist — Rotation der
`order`-Werte setzt also sauber die Start-Person je Leg.

### Rotation

Start-Person eines Legs = Spielreihenfolge rotiert um `legIndex mod nSpieler`
(**durchgehend über Sets hinweg**, Standard-Alternierung). Deterministisch, fair,
allein aus dem Log ableitbar.

### Set-/Match-Fortschritt

- **singleSet**: `legsWon[p] ≥ ceil(legs/2)` → `p` gewinnt das Match.
- **match**: `legsWon[p] ≥ ceil(legs/2)` → `p` gewinnt das **Set** (`setsWon[p] += 1`,
  `legsWon` zurücksetzen); `setsWon[p] ≥ ceil(sets/2)` → `p` gewinnt das Match.
- **casual**: genau ein Leg; Sieg des Legs = Sieg des Matches.

### Ausgabe des Match-Layers

`state` bleibt der **aktuelle-Leg-Zustand** (Board rendert unverändert). Zusätzlich
ein `match`-Objekt:

```ts
interface MatchSummary {
  format: MatchFormat;
  legsWon: Record<string, number>;   // im AKTUELLEN Set
  setsWon: Record<string, number>;   // nur match-Modus, sonst alles 0
  legNumber: number;                 // aktuelles Leg (1-basiert)
  setNumber: number;                 // aktuelles Set (1-basiert)
  legWinnerId: string | null;        // NUR gesetzt, wenn genau an einer Leg-Grenze
                                     //   (aktuelles Leg hat 0 Darts) → treibt Banner
  matchWinnerId: string | null;      // Gesamtsieger, sonst null
  finished: boolean;                 // Match beendet
}
```

`legWinnerId` ist nur an der exakten Leg-Grenze gesetzt (aktuelles Leg noch ohne Wurf)
und verschwindet automatisch mit dem ersten Dart des neuen Legs → transientes,
selbstlöschendes Banner, reconnect-fest.

Für **casual** ist `match` trivial (ein Leg, `matchWinnerId == state.winnerId`); die
UI blendet Zähler/Banner dann aus.

## 4. API-Änderungen (klein, lokal)

- **`validGameConfig`** (`api/games.ts`): validiert zusätzlich `options.format`
  (kind ∈ {casual, singleSet, match}; legs/sets ∈ {3,5,7} je nach kind).
- **`buildGameView`**: ruft den Match-Layer auf, hängt `match` an die `GameView`;
  `state` bleibt der Aktuelle-Leg-Zustand.
- **`play.ts` / Würfe**: Wurf wird **nur** abgelehnt, wenn das **Match** beendet ist
  (ein beendetes *Leg* muss den ersten Wurf des nächsten Legs annehmen).
  `setStatus('finished')` richtet sich nach Match-Ende. Undo/Reset rechnen ohnehin neu
  → funktionieren über Leg-Grenzen hinweg gratis.
- **Spieler hinzufügen gesperrt außer Casual**: `POST /api/games/:slug/players` lehnt
  bei laufendem Spiel (`status === 'running'`) mit `format.kind !== 'casual'` ab
  (409). Bei Casual bleibt der bisherige Mitten-im-Spiel-Beitritt (Aufholen/Handicap)
  erhalten. Dadurch entfällt der Aufhol-über-Legs-Grenzfall vollständig.

## 5. Frontend

### 5.1 Format-Auswahl (`GameOptionsPicker.tsx`)

Neuer **Format-Abschnitt** (genutzt von Erstellen **und** „Modus wechseln"), mit
progressiven Unter-Buttons im vorhandenen Pill-Stil:

- **Casual** — keine Unter-Buttons.
- **Single Set** — Reihe „Best of: **3 / 5 / 7** Legs".
- **Match** — Reihe „Best of: **3 / 5 / 7** Sets" + Reihe „Legs pro Set: **3 / 5 / 7**".

Der Abschnitt liegt als eigener Block bei den Spiel-Optionen. `onChange` liefert die
`options` inkl. `format`. Default: `casual`.

### 5.2 Set-/Legs-Zähler (`TurnBar.tsx`)

Neu **zwischen** „… ist dran" (Name) und dem „Dart x/3"-Zähler platziert (wie
gewünscht). Kompakt, gedämpfte Farbe:

- **Casual**: ausgeblendet.
- **Single Set**: `Legs 2–1` (2 Spieler*innen) bzw. `Legs 2·1·0` (3+, Sitzreihenfolge).
- **Match**: `Sets 1–0 · Legs 2–1` (bzw. `·`-Form bei 3+).

Der Zähler bekommt die Werte aus `view.match`.

### 5.3 Leg-Sieg-Banner

Kleines, **nicht-modales** Banner `Leg an <Name> — 2:1`, ohne Konfetti, sichtbar solange
`match.legWinnerId` gesetzt ist. Das Board des neuen Legs ist bereits darunter aktiv →
mit dem nächsten Wurf verschwindet das Banner automatisch („auto-continue").

### 5.4 Match-Sieg

Erst bei Match-Ende (`match.finished`) das bestehende Konfetti-`WinPopup` +
`FinishActions`, mit `match.matchWinnerId` als Sieger. Für Casual identisch zu heute.

### 5.5 Spieler hinzufügen sperren (UI)

Im Verlauf-/Settings-Tab (`HistoryTab`) wird die „Spieler*in hinzufügen"-Eingabe bei
laufendem Set-/Match-Spiel deaktiviert/ausgeblendet, mit kurzem Hinweistext
(„Im Set-/Match-Modus können keine Spieler*innen nachträglich beitreten."). Server
erzwingt dieselbe Regel (§4).

### 5.6 Miss-Button-Indikator

`Keypad` reicht seinen `flash`-Zustand an `Multiplier` durch; der Miss-Button erhält
bei `flash === 'miss'` dieselbe Amber-Flash-Optik (`dart-flash`-Klasse +
Amber-Hintergrund, 220 ms) wie die Zahlen-Tasten. Reine Optik, keine Logikänderung
(`fire('miss', …)` setzt `flash` bereits heute).

## 6. Typen (Web)

`web/src/types.ts`: `MatchFormat` + `MatchSummary` ergänzen; `GameView` bekommt
`match: MatchSummary`. Server-`GameView` (`api/games.ts`) analog.

## 7. Tests (TDD)

- **Match-Layer** (`engine/__tests__/match.test.ts`): Leg-/Set-/Match-Rollover,
  Rotation der Start-Person, binäre Grenzsuche, Undo über Leg-Grenzen, `casual`
  identisch zum Direktaufruf der pro-Leg-Engine, `legWinnerId`-Transienz.
- **API** (`api-play`/`api-games`): Wurf nach Leg-Ende erlaubt / nach Match-Ende
  abgelehnt; Validierung von `options.format`; Spieler-Hinzufügen im Set-/Match-Modus
  → 409.
- **Komponenten**: `TurnBar` (Zähler-Darstellung), `GameOptionsPicker`
  (progressive Unter-Buttons), `Multiplier`/`Keypad` (Miss-Flash), Leg-Banner.

## 8. Bekannte Grenzen

- **Mitten-im-Spiel-Beitritt** ist im Set-/Match-Modus bewusst gesperrt; die
  bestehende Aufhol-/Handicap-Logik bleibt nur für Casual relevant.
- **Rotation** ist rein legbasiert und durchgehend (kein Set-basierter Sonderfall) —
  bewusst einfach gehalten.
