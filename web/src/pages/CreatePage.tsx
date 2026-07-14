import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameType } from '../types.js';
import { createGame } from '../api.js';

type InOut = 'straight' | 'double' | 'master';

export function CreatePage() {
  const nav = useNavigate();
  const [gameType, setGameType] = useState<GameType>('x01');
  const [start, setStart] = useState<301 | 501 | 701>(501);
  const [inRule, setInRule] = useState<InOut>('straight');
  const [outRule, setOutRule] = useState<InOut>('double');
  const [cricketMode, setCricketMode] = useState<'standard' | 'cutthroat'>('standard');
  const [bull, setBull] = useState(true);
  const [players, setPlayers] = useState<string[]>([]);
  const [name, setName] = useState('');

  const addPlayer = () => {
    const n = name.trim().slice(0, 14);
    if (n) { setPlayers((p) => [...p, n]); setName(''); }
  };

  const buildOptions = (): unknown => {
    if (gameType === 'x01') return { start, in: inRule, out: outRule };
    if (gameType === 'cricket') return { mode: cricketMode, bull };
    return { advanceByMultiplier: true };
  };

  const submit = async () => {
    const { slug } = await createGame({ gameType, options: buildOptions(), players });
    nav(`/g/${slug}`);
  };

  const pill = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
    background: active ? 'var(--amber)' : 'var(--card)', color: active ? '#221803' : 'var(--text)',
    border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`, fontWeight: 700,
  });

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <h1>Neues Spiel</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {(['x01', 'cricket', 'aroundTheClock'] as GameType[]).map((g) => (
          <button key={g} style={pill(gameType === g)} onClick={() => setGameType(g)}>
            {g === 'x01' ? 'x01' : g === 'cricket' ? 'Cricket' : 'Around the Clock'}
          </button>
        ))}
      </div>

      {gameType === 'x01' && (
        <div style={{ marginBottom: 20 }}>
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
        <div style={{ display: 'flex', gap: 7, marginBottom: 20 }}>
          <button style={pill(cricketMode === 'standard')} onClick={() => setCricketMode('standard')}>Standard</button>
          <button style={pill(cricketMode === 'cutthroat')} onClick={() => setCricketMode('cutthroat')}>Cut-Throat</button>
          <button style={pill(bull)} onClick={() => setBull((b) => !b)}>Bull {bull ? 'an' : 'aus'}</button>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
          {players.map((p, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', display: 'flex' }}>
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

      <button onClick={submit} style={{ width: '100%', background: 'var(--amber)', color: '#221803', border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 800 }}>
        Spiel erstellen →
      </button>
    </div>
  );
}
