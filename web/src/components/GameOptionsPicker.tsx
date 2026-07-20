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

// Zuletzt gewählte Einstellungen lokal merken (gleiches Gerät, nächster Besuch).
const SETTINGS_KEY = 'dc:createOptions';
interface Saved {
  gameType: GameType; start: 301 | 501 | 701; inRule: InOut; outRule: InOut;
  cricketMode: 'standard' | 'cutthroat'; bull: boolean;
  formatKind: MatchFormat['kind']; legs: 3 | 5 | 7; sets: 3 | 5 | 7;
}
function readSaved(): Partial<Saved> {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Saved>; }
  catch { return {}; }
}

/**
 * Auswahl von Spiel + Optionen + Format. Spiel als Karte; Optionen und Format als
 * standardmäßig zugeklappte Folds (Optionen entfällt bei Around the Clock). Meldet die
 * Konfiguration via `onChange` — genutzt beim Erstellen und beim „Modus wechseln".
 */
export function GameOptionsPicker({ onChange }: { onChange: (gameType: GameType, options: unknown) => void }) {
  const [saved] = useState(readSaved); // einmalig beim Mount lesen
  const [gameType, setGameType] = useState<GameType>(saved.gameType ?? 'x01');
  const [start, setStart] = useState<301 | 501 | 701>(saved.start ?? 501);
  const [inRule, setInRule] = useState<InOut>(saved.inRule ?? 'straight');
  const [outRule, setOutRule] = useState<InOut>(saved.outRule ?? 'double');
  const [cricketMode, setCricketMode] = useState<'standard' | 'cutthroat'>(saved.cricketMode ?? 'standard');
  const [bull, setBull] = useState(saved.bull ?? true);
  const [formatKind, setFormatKind] = useState<MatchFormat['kind']>(saved.formatKind ?? 'casual');
  const [legs, setLegs] = useState<3 | 5 | 7>(saved.legs ?? 3);
  const [sets, setSets] = useState<3 | 5 | 7>(saved.sets ?? 3);

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
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ gameType, start, inRule, outRule, cricketMode, bull, formatKind, legs, sets })); } catch { /* Storage n/a */ }
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
