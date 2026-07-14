# Dart Games Counter — Design-Dokument

**Datum:** 2026-07-14
**Status:** Abgestimmt, bereit für Implementierungs-Plan

## 1. Zweck & Vision

Eine Web-App, mit der man unkompliziert einen Dart-Zähler für einen Spieleabend
erstellt. Beim Erstellen wählt man Spiel + Variante, bekommt einen teilbaren Link,
über den alle an ihren **eigenen Handys** mitzählen können — oder man reicht **ein
Handy** herum. Fokus liegt auf einem besonders **gut lesbaren Cricket-Board**, das
an üblichen Automaten/Tafeln oft schwer zu erfassen ist.

Kernprinzipien: **casual** (keine Legs/Sets, kein Login), **live** (alle sehen
denselben Stand in Echtzeit), **kurzlebig** (Spiele löschen sich nach 24h selbst).

## 2. Geltungsbereich (v1)

**Enthalten:**
- Spielarten: **x01** (301/501/701), **Cricket** (Standard + Cut-Throat), **Around the Clock**.
- Teilbarer Link + QR-Code, Live-Sync über mehrere Geräte.
- Eingabe pro Dart (Single/Double/Triple/Miss).
- Globaler, schrittweiser Undo (über Spielerwechsel hinweg).
- Beitreten während des laufenden Spiels (Aufholen vs. Handicap).
- Verlauf-Tab mit kompletter Wurf-Historie.
- Auto-Löschung nach 24h + „Spiel verlängern".
- Gewinn-Pop-up mit Konfetti.

**Nicht enthalten (YAGNI):** Legs/Sets/Best-of, Benutzerkonten, Statistik über
Spiele hinweg, Exoten-Varianten (Shanghai, Halve It, Killer …), Geräte-/Spieler-
Locking, native Apps.

## 3. Architektur

Ein einzelner **Docker-Container**, deploybar auf dem eigenen VPS.

- **Frontend:** React + TypeScript (Vite). Live-Updates via WebSocket.
- **Backend:** Node + TypeScript (Fastify). REST für Erstellen/Beitreten/Verlängern,
  WebSocket-Server (`ws`) für Echtzeit-Broadcast pro Spiel.
- **Persistenz:** SQLite (Datei auf einem Docker-Volume). Ausreichend für viele
  parallele, kurzlebige Spiele mit geringer Parallelität pro Spiel.
- **Auth:** keine. Ein Spiel wird über einen **unratbaren Slug** adressiert
  (z.B. `k7mq-9xz2`, ausreichend Entropie). Wer den Link hat, darf mitspielen und
  eintragen.

```
Browser (React) ──REST──▶  Fastify  ──▶ SQLite
       ▲                      │
       └──────WebSocket───────┘   (Broadcast an alle Clients desselben Spiels)
```

### Modul-Grenzen (klare Verantwortlichkeiten)
- **`game-engine`** (rein, ohne I/O): nimmt die Event-Liste eines Spiels + Regeln
  und berechnet den kompletten Zustand (Punkte/Marks, wer ist dran, Sieg, tote
  Zahlen). Pro Spielart ein Regel-Modul mit gemeinsamem Interface.
- **`api`**: REST-Endpunkte + Validierung.
- **`realtime`**: WebSocket-Räume pro Spiel, Broadcast.
- **`persistence`**: SQLite-Zugriff, Cleanup-Job.
- **Frontend**: `board`-Komponenten pro Spielart, `keypad`/`input`, `history`,
  `create`, `share`, `join`, `win`.

## 4. Datenmodell

```
Game
  id            (intern)
  slug          (Link-Segment, unratbar)
  gameType      'x01' | 'cricket' | 'aroundTheClock'
  options       JSON  (siehe unten)
  status        'lobby' | 'running' | 'finished'
  createdAt     timestamp
  expiresAt     timestamp   (createdAt + 24h, per Verlängern verschiebbar)

Player
  id
  gameId
  name          (max ~14 Zeichen)
  order         (Sitzreihenfolge)
  joinedAtRound (0 = von Beginn)
  catchUp       'catchUp' | 'handicap'   (nur relevant bei Mid-Game-Beitritt)

ThrowEvent   (append-only Log — die "source of truth")
  id
  gameId
  seq           (monoton, für Reihenfolge & Undo)
  playerId
  round
  dartIndex     (0..2, plus Aufhol-Extra-Darts)
  segment       1..20 | 25 (Bull) | 0 (Miss)
  multiplier    1 | 2 | 3        (bei Bull: 1=25, 2=50; Miss: 0)
```

**Options je Spielart:**
- x01: `{ start: 301|501|701, in: 'straight'|'double'|'master', out: 'straight'|'double'|'master' }`
- cricket: `{ mode: 'standard'|'cutthroat', bull: true|false }`
- aroundTheClock: `{ }` (1→20→Bull, Single)

### Warum ein Event-Log?
Der gesamte Spielzustand ist eine **reine Funktion** der Event-Liste. Das gibt uns:
- **Undo** trivial: höchstes `seq` löschen, Zustand neu berechnen — funktioniert
  über Aufnahmen und Spielerwechsel hinweg, in jeder Spielart.
- **Verlauf-Tab** direkt aus dem Log.
- **Live-Sync** einfach: neuer Event → an alle broadcasten → jeder rechnet neu
  (oder Server rechnet und schickt Zustand).

## 5. Eingabe

**Pro Dart, drei einzeln.** Ablauf: optional Multiplikator wählen (Single ist
Standard), dann Ziel.

- **x01:** Ziffernblock (1–20, 25, Bull, Miss). Multiplikator-Reihe (Single/Double/
  Triple). Laufende Aufnahme wird mit den 3 Darts + **Summe** angezeigt. Nach 3 Darts
  Auto-Weiter; „Weiter"-Button nur für frühen Abschluss (Sieg/Bust/Abbruch).
  Double-Out wird beim Abschluss automatisch geprüft.
- **Cricket:** Eingabe **direkt auf dem Board** — Multiplikator wählen, dann in der
  **Spalte** der aktiven Person aufs Ziel tippen (Triple = 3 Marks). „Miss"
  verbucht einen Dart daneben. Keine separaten Dart-Kästchen/Summe (die Würfe stehen
  ja schon auf dem Board).

**Undo:** kleines Icon (nur Icon) **links** vom „Dart x/3"-Zähler. Nimmt das letzte
Event zurück, Schritt für Schritt, inkl. Rücksprung zur vorherigen Person.

## 6. Cricket-Board (das Herzstück)

Finales Design (aus Mockups abgestimmt):

- **Hochkant-Layout:** Spieler*innen als **Spalten** (Namen oben), Zahlen als
  **Zeilen**, **aufsteigend 15 → 16 → 17 → 18 → 19 → 20 → Bull** von oben nach unten.
  Punkte-Summe pro Spalte ganz unten.
- **Marks-Symbole:** `·` offen → `╱` 1× → `✕` 2× → `Ⓧ` zu.
- **Farben:** **Grün** = Zahl von dieser Person zugemacht (punktet). **Amber** =
  wer gerade dran ist (Spalte + Name hervorgehoben) — bewusst **anders** als Grün,
  damit „dran" und „zu" nicht verwechselt werden.
- **Rot = tot:** Sobald **alle** Spieler*innen eine Zahl zugemacht haben, wird die
  ganze Zeile **rot** (durchgestrichene Zahl) — signalisiert: hier punktet niemand mehr.
- **Skalierung / viele Spieler*innen:** die Spielerspalten sind **horizontal
  scrollbar**, die Zahlen-Spalte links bleibt **fix** stehen. Rechter Fade als Hinweis.
- **Lange Namen:** im Spaltenkopf per **Ellipsis** abgeschnitten (`Sebast…`); der
  **volle Name** steht immer in der „… ist dran"-Leiste und als Tooltip beim Antippen.
- **Multiplikator-Reihe** über dem Board (bei hochkant oben): kompakt, ausgeschrieben
  **Single · Double · Triple · Miss** (deutlich kleiner als die Board-Zellen).

*(Alternatives „quer"-Layout — Namen links, Zahlen als Spalten — wurde verglichen und
verworfen; hochkant liest sich für die üblichen 2–4 Spieler*innen angenehmer.)*

## 7. x01-Board

Gleiche Designsprache (dunkel, Amber-Akzent). Pro Person eine Zeile mit **Restpunkten**
(groß), Name, optional Ø-Wert. Aktive Zeile amber hervorgehoben. Darunter Ziffernblock
(siehe Eingabe).

**Bust (Überwerfen / Double-Out verfehlt):** Die Aufnahme wird ungültig, die Punktzahl
bleibt auf dem Stand vom **Zug-Beginn**, und **der Nächste ist dran** (kein erneutes
Werfen der Restdarts).

## 7a. Around-the-Clock-Board

Ziel: reihum **1 → 2 → … → 20 → Bull** treffen; wer zuerst Bull trifft, gewinnt.

- Pro Person eine **Zeile**: aktuelles **Ziel groß links** (z.B. „12"), daneben Name +
  **Fortschrittsbalken** aus 21 Segmenten (1–20 + Bull) und ein Zähler (`11/21`).
- **Amber** = wer dran ist, **Grün** = fertig (mit 🏆).
- **Multiplikator-Reihe** (Single · Double · Triple · Miss) **über** dem Board, wie beim
  Cricket-Board.
- Eingabe: Treffer aufs aktuelle Ziel rückt ein Feld weiter. **Double/Triple des Ziels
  rücken 2/3 Felder** auf einmal (optionale Regel). „Miss" = Dart daneben.

## 8. Erstellen-Flow

Eine **scrollbare Seite** (kein mehrstufiger Wizard):
1. **Spiel** wählen (x01 / Cricket / Around the Clock) als Kacheln.
2. **Kontextabhängige Optionen** (x01: Startpunkte + In/Out; Cricket: Standard/
   Cut-Throat + Bull; Around the Clock: keine).
3. **Spieler*innen** hinzufügen (Namen, sortierbar per Drag-Griff, entfernbar).
   Hinweis: weitere können später über den Link beitreten.
4. **„Spiel erstellen"**.

*Kein* Legs/Sets-Modus und *keine* „Wie wird gespielt?"-Auswahl — der Link
funktioniert für „selbes Handy" und „eigene Handys" identisch.

## 9. „Spiel erstellt" / Teilen

Bestätigungs-Screen: Häkchen + „Spiel erstellt!", kurze Zusammenfassung, **Link mit
Kopieren-Button** (Feedback „Kopiert ✓"), **QR-Code** zum Beitreten, großer
**„Los geht's →"**-Button. Hinweis: Teilen ist optional — wer den Link nicht bekommt,
verpasst nichts, weil zur Not eine Person alle Würfe eintippt.

## 10. Mitten-im-Spiel beitreten

Öffnet jemand den Link während `status = running`, erscheint ein Dialog:
- Name eingeben.
- **Aufholen (Default, „fair"):** bei ihrem nächsten Zug bekommt die Person so viele
  **Extra-Darts**, wie die anderen bereits geworfen haben, sodass danach alle gleich
  viele Darts geworfen haben. (x01: Extra-Darts am Stück; Cricket: Extra-Darts zum
  Marks-Nachholen.)
- **Direkt einsteigen (Handicap):** startet regulär (x01: volle Startpunktzahl,
  Cricket: 0 Marks) und liegt entsprechend zurück.

Umsetzung: `Player.catchUp` + `joinedAtRound` steuern, wie viele Extra-Darts die
Engine der Person bei ihrem ersten Zug zugesteht. Die Aufhol-Menge wird **an der
aktuellen Runde ausgerichtet**: die Person bekommt so viele Extra-Darts, dass sie nach
ihrem ersten Zug in derselben Runde wie die anderen ist (gleich viele Aufnahmen/Darts).

## 11. Lebensdauer & Verlängern

- **Fix 24h ab Erstellung.** `expiresAt = createdAt + 24h`.
- **Hintergrund-Cleanup** (periodischer Job) löscht abgelaufene Spiele samt Events.
- **Sichtbarer Countdown** im Spiel-UI.
- **„Spiel verlängern"** setzt `expiresAt` neu; Auswahl **+1 Tag / +1 Woche / +1 Monat**.

## 12. Verlauf

**Eigener Verlauf-Tab** (Board bleibt clean). Zeigt die komplette Wurf-Historie aus
dem Event-Log, chronologisch und pro Person nachvollziehbar (Runde, Darts, Segmente,
Multiplikator/Miss).

## 13. Gewinn

Bei Sieg: **Konfetti-Animation** + kleines **Pop-up** über abgedunkeltem Board
(Trophäe/🎯, „<Name> gewinnt!", kurze Stats). Oben rechts ein kleines **Undo-Icon
(„Fehltipp")** — nimmt den letzten Wurf zurück und setzt das Spiel fort, falls der
Sieg ein Fehltipp war. Buttons: „Nochmal spielen" / „Zur Übersicht".

## 13a. Robustheit & Sicherheit

- **WebSocket-Reconnect:** Verliert ein Client die Verbindung (WLAN weg, Bildschirm
  gesperrt) und verbindet sich neu, wird der **komplette aktuelle Spielzustand
  automatisch nachgeladen** (State-Resync). Keine veralteten Boards.
- **QR-Code:** wird **client-seitig** im Browser erzeugt (kleine JS-Bibliothek), kein
  Server-Roundtrip.
- **Rate-Limiting / Missbrauchsschutz** (kein Login → wichtig):
  - Begrenzung der **Spiel-Erstellungen pro IP** und Zeitfenster.
  - Begrenzung der **WebSocket-Verbindungen** pro IP.
  - **Deckel für gleichzeitig aktive Spiele** insgesamt.
  - Ziel: kein Bot kann die Seite durch Massen-Erstellung überlasten.

## 14. Visuelle Sprache

Dunkles Theme (`#12151c`-Basis), **Amber** (`#f5b544`) als Aktions-/„dran"-Akzent,
**Grün** (`#46d38a`) für „zu/gut", **Rot** (`#f2645f`) für „tot". Große, gut
antippbare Flächen, tabellarische Ziffern, klare Hierarchie. Mobile-first.

## 15. Offene Implementierungs-Details (für den Plan)

Die zuvor offenen Punkte sind entschieden (Aufhol-Logik an Runde → §10, Bust-Regel →
§7, Reconnect/QR/Rate-Limiting → §13a). Rest für den Plan:

- Konkrete Rate-Limit-Schwellen (Erstellungen/IP/Stunde, WS-Verbindungen, globaler
  Spiel-Deckel) — sinnvolle Startwerte festlegen.
- Master-In/Out-Semantik in der x01-Engine (Master = Double **oder** Triple zählt).
- Cut-Throat-Punktlogik im Cricket-Modul (Punkte gehen an Gegner, „tot"-Regel greift
  weiterhin bei allen zu).
