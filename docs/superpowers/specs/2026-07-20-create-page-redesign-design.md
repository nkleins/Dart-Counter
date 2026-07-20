# Erstellungs-Seite Redesign (Hybrid, einklappbar) — Design-Dokument

**Datum:** 2026-07-20
**Status:** In Abstimmung

## 1. Zweck

Die Match-Erstellungsseite wirkt durch die vielen gestapelten Pill-Reihen (Spieltyp,
Start/In/Out, Format + Best-of-Unterreihen, Spieler\*innen) unübersichtlich. Das
Redesign gliedert sie in **abgesetzte Karten mit Überschriften** und steckt die
Detail-Optionen in **einklappbare Bereiche** (Variante B / Hybrid). Es bleibt **eine
scrollbare Seite** — kein Wizard. Das Ingame-UI bleibt unangetastet.

## 2. Struktur (von oben nach unten)

1. Überschrift **„Neues Spiel"**
2. **Spiel** — Karte mit Eyebrow; Spieltyp-Kacheln (x01 / Cricket / Around the Clock), sichtbar.
3. **Optionen** — einklappbarer Bereich (`Fold`), **standardmäßig zugeklappt**.
   - x01: Start (301/501/701) · In · Out.
   - Cricket: Standard/Cut-Throat · Bull an/aus.
   - **Around the Clock: keine Optionen → der Optionen-Fold entfällt komplett.**
4. **Format** — einklappbarer Bereich (`Fold`), **standardmäßig zugeklappt**.
   - Casual / Single Set / Match; bei Single Set/Match die progressiven Best-of-Reihen
     (Sets über Legs).
5. **Spieler\*innen** — Karte mit Eyebrow; Namensliste + Eingabe + „+ Add", sichtbar.
6. **„Spiel erstellen →"**-Button.

## 3. Fold-Verhalten

Die Kopfzeile eines Folds zeigt: **Label** (Eyebrow-Stil) · rechts die **Kurzfassung der
aktuellen Wahl** · **Chevron** (rotiert beim Öffnen). Antippen klappt den bestehenden
Pill-Regler-Block auf/zu. Beide Folds starten **zu**.

**Kurzfassungen (Summary):**
- Optionen x01: `501 · In Straight · Out Double` (Werte großgeschrieben).
- Optionen Cricket: `Standard · Bull an` (bzw. `Cut-Throat · Bull aus`).
- Format Casual: `Casual · Ein Leg`.
- Format Single Set: `Single Set · Best of 3 Legs`.
- Format Match: `Match · Best of 3 Sets · je 3 Legs`.

## 4. Defaults (unverändert)

Spieltyp **x01**; x01 Start **501**, In **Straight**, Out **Double**; Cricket **Standard**
+ Bull **an**; Format **Casual** (Legs/Sets-Unterwahl je **3**). Beide Folds **zu**.

## 5. Komponenten & Grenzen

- **Neu: `web/src/components/Fold.tsx`** — kleine, kontrollierte Klapp-Komponente:
  `Fold({ label, summary, defaultOpen = false, children })`. Rendert eine Karte mit
  einer `<button>`-Kopfzeile (Label · Summary · Chevron, `aria-expanded`) und den
  Inhalt nur wenn offen. Rein präsentational, keine Fachlogik.
- **`GameOptionsPicker.tsx`** wird umgebaut: rendert die **Spiel**-Karte, den
  **Optionen**-Fold (entfällt bei ATC) und den **Format**-Fold. Baut die Summary-Strings
  aus dem eigenen State. **Der `onChange(gameType, options)`-Vertrag bleibt identisch** —
  CreatePage, „Modus wechseln" (FinishActions) und das Backend bleiben unberührt. Die
  Folds erscheinen im „Modus wechseln"-Dialog konsistent mit.
- **`CreatePage.tsx`**: Spieler\*innen-Bereich als Karte mit Eyebrow „Spieler\*innen";
  Überschrift + Erstellen-Button wie gehabt.
- Karten-/Eyebrow-Stil konsistent zum Bestand (dunkle Karte, Amber-Eyebrow wie in
  `HistoryTab`).

## 6. Tests

- **`Fold`**: startet je nach `defaultOpen` zu/auf; Klick auf die Kopfzeile toggelt
  Sichtbarkeit des Inhalts; `aria-expanded` spiegelt den Zustand.
- **Picker/CreatePage**: die bestehenden Tests, die Sub-Optionen wählen (z. B. „7 Legs"),
  klappen zuerst den betreffenden Fold auf. `onChange` liefert weiterhin dieselben
  `options` inkl. `format`. Casual bleibt Default.
- **Live-Check** im Browser (dunkles Theme, Fold auf/zu, Summary korrekt) vor Abschluss.

## 7. Nicht enthalten (YAGNI)

Kein Wizard; keine Änderung der Default-Werte; keine Änderung am Ingame-UI oder am
Backend/Datenmodell.
