import { useState } from 'react';
import type { GameView, PlayerMeta, MatchFormat } from '../types.js';

/** Lesbare Beschreibung des gewählten Formats für den Standings-Kopf. */
function formatLabel(f: MatchFormat): string {
  if (f.kind === 'casual') return 'Casual · Ein Leg';
  if (f.kind === 'singleSet') return `Single Set · Best of ${f.legs} Legs`;
  return `Match · Best of ${f.sets} Sets, je Best of ${f.legs} Legs`;
}

export function HistoryTab({ view, onJoin, onRemove, onExtend, onHome }: {
  view: GameView;
  onJoin: (input: { name: string; catchUp: 'catchUp' | 'handicap' }) => void;
  onRemove: (playerId: string) => void;
  onExtend: (d: '1d' | '1w' | '1M') => void;
  onHome: () => void;
}) {
  const [name, setName] = useState('');
  const [catchUp, setCatchUp] = useState<'catchUp' | 'handicap'>('catchUp');
  const running = view.status === 'running';
  const joinLocked = running && view.match.format.kind !== 'casual';

  const nameOf = (id: string) => view.players.find((p: PlayerMeta) => p.id === id)?.name ?? id;
  const label = (seg: number, mul: number) => seg === 0 ? 'Miss' : seg === 25 ? (mul === 2 ? 'Bull(50)' : 'Bull(25)') : `${['', 'S', 'D', 'T'][mul]}${seg}`;

  const add = () => {
    const n = name.trim().slice(0, 14);
    if (n) { onJoin({ name: n, catchUp: running ? catchUp : 'handicap' }); setName(''); }
  };

  const expires = new Date(view.expiresAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const heading: React.CSSProperties = { fontSize: 12, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 9px' };
  const chip: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 9, padding: '8px 12px', fontWeight: 700 };

  const fmt = view.match.format;
  const isMatch = fmt.kind === 'match';
  const hasLegsCol = fmt.kind !== 'casual';
  const isX01 = view.gameType === 'x01';
  const showStandings = hasLegsCol || isX01; // Sets/Legs oder (x01) der Ø geben etwas her
  const colNum: React.CSSProperties = { width: 40, textAlign: 'right', fontWeight: 700 };
  const colHead: React.CSSProperties = { width: 40, textAlign: 'right' };

  return (
    <div>
      {/* — Standings — */}
      {showStandings && (
        <section style={{ marginBottom: 20 }}>
          <h3 style={heading}>Standings</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 9 }}>{formatLabel(fmt)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, padding: '0 12px 4px' }}>
            <span style={{ flex: 1 }} />
            {isMatch && <span style={colHead}>Sets</span>}
            {hasLegsCol && <span style={colHead}>Legs</span>}
            {isX01 && <span style={{ ...colHead, width: 56 }}>Ø</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {view.players.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {isMatch && <span style={colNum}>{view.match.setsWon[p.id] ?? 0}</span>}
                {hasLegsCol && <span style={colNum}>{view.match.legsWon[p.id] ?? 0}</span>}
                {isX01 && <span style={{ ...colNum, width: 56, fontWeight: 400, color: 'var(--muted)' }}>{view.match.averages ? (view.match.averages[p.id] ?? 0).toFixed(1) : '—'}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* — Spieler*innen — */}
      <section style={{ marginBottom: 20 }}>
        <h3 style={heading}>Spieler*innen</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {view.players.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              {view.players.length > 1 && (
                <button title="Entfernen" onClick={() => { if (confirm(`${p.name} aus dem Spiel entfernen?`)) onRemove(p.id); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 2 }}>✕</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Name…" value={name} maxLength={14} disabled={joinLocked}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            style={{ flex: 1, background: '#141922', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', color: 'var(--text)', opacity: joinLocked ? 0.5 : 1 }} />
          <button onClick={add} disabled={joinLocked} style={{ ...chip, padding: '0 16px', opacity: joinLocked ? 0.5 : 1 }}>+ Add</button>
        </div>
        {joinLocked && (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0' }}>Im Set-/Match-Modus können keine Spieler*innen nachträglich beitreten.</p>
        )}
        {running && !joinLocked && (
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

      {/* — Hauptmenü — */}
      <section style={{ marginBottom: 20 }}>
        <button onClick={onHome} style={{ ...chip, width: '100%', padding: 12 }}>Zurück zum Hauptmenü</button>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0', textAlign: 'center' }}>
          Das Spiel bleibt unter diesem Link 24&nbsp;Stunden erhalten – außer du verlängerst es oben.
        </p>
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
