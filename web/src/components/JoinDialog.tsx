import { useState } from 'react';

export function JoinDialog({ round, onJoin }: { round: number; onJoin: (input: { name: string; catchUp: 'catchUp' | 'handicap' }) => void }) {
  const [name, setName] = useState('');
  const [catchUp, setCatchUp] = useState<'catchUp' | 'handicap'>('catchUp');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,14,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40 }}>
      <div style={{ width: 300, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--amber)', textTransform: 'uppercase', textAlign: 'center' }}>Läuft bereits · Runde {round}</div>
        <h2 style={{ textAlign: 'center', margin: '4px 0 16px' }}>Du steigst mit ein 👋</h2>
        <input placeholder="Dein Name" value={name} maxLength={14} onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', background: '#141922', border: '1px solid var(--border)', borderRadius: 11, padding: 12, color: 'var(--text)', marginBottom: 14 }} />
        {(['catchUp', 'handicap'] as const).map((c) => (
          <div key={c} onClick={() => setCatchUp(c)} style={{ padding: 12, borderRadius: 12, marginBottom: 9, cursor: 'pointer',
            background: catchUp === c ? '#211d13' : 'var(--bg)', border: `1px solid ${catchUp === c ? 'var(--amber)' : 'var(--border)'}` }}>
            <b style={{ color: catchUp === c ? 'var(--amber)' : 'var(--text)' }}>{c === 'catchUp' ? 'Aufholen (fair)' : 'Direkt einsteigen'}</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c === 'catchUp' ? 'Extra-Darts, damit alle gleichauf sind.' : 'Normal starten, mit Handicap.'}</div>
          </div>
        ))}
        <button disabled={!name.trim()} onClick={() => onJoin({ name: name.trim().slice(0, 14), catchUp })}
          style={{ width: '100%', marginTop: 6, background: 'var(--amber)', color: '#221803', border: 'none', borderRadius: 13, padding: 14, fontWeight: 800, opacity: name.trim() ? 1 : 0.5 }}>Mitspielen →</button>
      </div>
    </div>
  );
}
