import { useEffect, useState } from 'react';
import type { GameType } from '../types.js';

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

  useEffect(() => {
    const options: unknown =
      gameType === 'x01' ? { start, in: inRule, out: outRule } :
      gameType === 'cricket' ? { mode: cricketMode, bull } :
      { advanceByMultiplier: true };
    onChange(gameType, options);
    // Nur bei tatsächlicher Auswahl-Änderung neu melden (onChange bewusst nicht in den Deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, start, inRule, outRule, cricketMode, bull]);

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
    </div>
  );
}
