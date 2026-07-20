import { useEffect, useState } from 'react';
import type { GameType, MatchFormat } from '../types.js';

type InOut = 'straight' | 'double' | 'master';

const pill = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
  background: active ? 'var(--amber)' : 'var(--card)', color: active ? '#221803' : 'var(--text)',
  border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`, fontWeight: 700,
});

/**
 * Auswahl von Spielmodus + Modus-Optionen (x01: Start/In/Out, Cricket: Modus/Bull).
 * Meldet die aktuelle Konfiguration via `onChange`. Wird sowohl beim Erstellen als
 * auch beim „Modus wechseln" nach dem Sieg genutzt.
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
    // Nur bei tatsächlicher Auswahl-Änderung neu melden (onChange bewusst nicht in den Deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, start, inRule, outRule, cricketMode, bull, formatKind, legs, sets]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {(['x01', 'cricket', 'aroundTheClock'] as GameType[]).map((g) => (
          <button key={g} style={pill(gameType === g)} onClick={() => setGameType(g)}>
            {g === 'x01' ? 'x01' : g === 'cricket' ? 'Cricket' : 'Around the Clock'}
          </button>
        ))}
      </div>

      {gameType === 'x01' && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
            {([301, 501, 701] as const).map((s) => <button key={s} style={pill(start === s)} onClick={() => setStart(s)}>{s}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
            {(['straight', 'double', 'master'] as InOut[]).map((r) => <button key={r} style={pill(inRule === r)} onClick={() => setInRule(r)}>In: {r}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {(['straight', 'double', 'master'] as InOut[]).map((r) => <button key={r} style={pill(outRule === r)} onClick={() => setOutRule(r)}>Out: {r}</button>)}
          </div>
        </div>
      )}

      {gameType === 'cricket' && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
          <button style={pill(cricketMode === 'standard')} onClick={() => setCricketMode('standard')}>Standard</button>
          <button style={pill(cricketMode === 'cutthroat')} onClick={() => setCricketMode('cutthroat')}>Cut-Throat</button>
          <button style={pill(bull)} onClick={() => setBull((b) => !b)}>Bull {bull ? 'an' : 'aus'}</button>
        </div>
      )}

      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 9 }}>Format</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: formatKind === 'casual' ? 0 : 10 }}>
          {([['casual', 'Casual'], ['singleSet', 'Single Set'], ['match', 'Match']] as [MatchFormat['kind'], string][]).map(([k, label]) => (
            <button key={k} style={pill(formatKind === k)} onClick={() => setFormatKind(k)}>{label}</button>
          ))}
        </div>
        {/* Sets ist übergeordnet -> im Match-Modus zuerst, Legs darunter. */}
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
      </div>
    </div>
  );
}
