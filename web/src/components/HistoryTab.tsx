import { useState } from 'react';
import type { GameView, PlayerMeta } from '../types.js';

export function HistoryTab({ view, onJoin, onExtend }: {
  view: GameView;
  onJoin: (input: { name: string; catchUp: 'catchUp' | 'handicap' }) => void;
  onExtend: (d: '1d' | '1w' | '1M') => void;
}) {
  const [name, setName] = useState('');
  const [catchUp, setCatchUp] = useState<'catchUp' | 'handicap'>('catchUp');
  const running = view.status === 'running';

  const nameOf = (id: string) => view.players.find((p: PlayerMeta) => p.id === id)?.name ?? id;
  const label = (seg: number, mul: number) => seg === 0 ? 'Miss' : seg === 25 ? (mul === 2 ? 'Bull(50)' : 'Bull(25)') : `${['', 'S', 'D', 'T'][mul]}${seg}`;

  const add = () => {
    const n = name.trim().slice(0, 14);
    if (n) { onJoin({ name: n, catchUp: running ? catchUp : 'handicap' }); setName(''); }
  };

  const expires = new Date(view.expiresAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const heading: React.CSSProperties = { fontSize: 12, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 9px' };
  const chip: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 9, padding: '8px 12px', fontWeight: 700 };

  return (
    <div>
      {/* — Spieler*in hinzufügen — */}
      <section style={{ marginBottom: 20 }}>
        <h3 style={heading}>Spieler*in hinzufügen</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Name…" value={name} maxLength={14}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            style={{ flex: 1, background: '#141922', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', color: 'var(--text)' }} />
          <button onClick={add} style={{ ...chip, padding: '0 16px' }}>+ Add</button>
        </div>
        {running && (
          <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
            {(['catchUp', 'handicap'] as const).map((c) => {
              const on = catchUp === c;
              return (
                <button key={c} onClick={() => setCatchUp(c)}
                  style={{ flex: 1, textAlign: 'left', borderRadius: 10, padding: '9px 11px', cursor: 'pointer',
                    background: on ? '#211d13' : 'var(--bg)', border: `1px solid ${on ? 'var(--amber)' : 'var(--border)'}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: on ? 'var(--amber)' : 'var(--text)' }}>{c === 'catchUp' ? 'Aufholen' : 'Handicap'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c === 'catchUp' ? 'Extra-Darts, damit alle gleichauf sind.' : 'Normal starten.'}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* — Länger speichern — */}
      <section style={{ marginBottom: 20 }}>
        <h3 style={heading}>Länger speichern</h3>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 9 }}>Läuft ab: {expires}</div>
        <div style={{ display: 'flex', gap: 7 }}>
          {(['1d', '1w', '1M'] as const).map((d) => (
            <button key={d} onClick={() => onExtend(d)} style={{ ...chip, flex: 1 }}>
              +{d === '1d' ? '1 Tag' : d === '1w' ? '1 Woche' : '1 Monat'}
            </button>
          ))}
        </div>
      </section>

      {/* — Verlauf — */}
      <section>
        <h3 style={heading}>Verlauf</h3>
        {[...view.history].reverse().map((e) => (
          <div key={e.seq} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: e.catchUp ? 'var(--amber)' : 'var(--muted)', flex: '0 0 auto' }}>{e.catchUp ? 'Aufholrunde' : `Runde ${e.round}`} · Wurf {e.dartNo}</span>
            <span style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(e.playerId)}</span>
            <span style={{ fontWeight: 700, flex: '0 0 auto', minWidth: 44, textAlign: 'right' }}>{label(e.segment, e.multiplier)}</span>
          </div>
        ))}
        {view.history.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Noch keine Würfe.</p>}
      </section>
    </div>
  );
}
