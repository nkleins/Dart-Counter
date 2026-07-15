import { useRef, useState } from 'react';
import type { AtcState, Dart, PlayerMeta } from '../../types.js';
import { Multiplier, type MulValue } from '../Multiplier.js';

export function AtcBoard({ state, players, onThrow }: { state: AtcState; players: PlayerMeta[]; onThrow: (d: Dart) => void }) {
  const [mul, setMul] = useState<MulValue>(1);
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const onMul = (v: MulValue) => { if (v === 'miss') onThrow({ segment: 0, multiplier: 0 }); else setMul(v); };
  const total = state.sequence.length;

  const doFlash = (id: string) => {
    setFlash(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash((f) => (f === id ? null : f)), 220);
  };
  const hit = (pid: string, target: number) => { doFlash(pid); onThrow({ segment: target, multiplier: mul === 'miss' ? 1 : mul }); };

  return (
    <div style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
      <div style={{ marginBottom: 14 }}><Multiplier value={mul} onChange={onMul} /></div>
      {state.players.map((p) => {
        const active = p.playerId === state.currentPlayerId;
        const tappable = active && !p.finished && p.target !== null;
        const label = p.target === null ? 'Fertig' : p.target === 25 ? 'Bull' : String(p.target);
        return (
          <button key={p.playerId} disabled={!tappable}
            className={flash === p.playerId ? 'dart-flash' : undefined}
            onClick={tappable ? () => hit(p.playerId, p.target as number) : undefined}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', borderRadius: 14, marginBottom: 9,
              cursor: tappable ? 'pointer' : 'default', transition: 'background 120ms, border-color 120ms',
              background: p.finished ? '#12251a' : active ? '#211d13' : 'var(--card)', border: `1px solid ${p.finished ? 'var(--green)' : active ? 'var(--amber)' : 'var(--border)'}`, color: 'var(--text)' }}>
            {/* Ziel als klar erkennbarer Button/Pille */}
            <div style={{ width: 56, textAlign: 'center', flex: '0 0 auto' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>{p.finished ? 'Fertig' : 'Ziel'}</div>
              <div style={{ marginTop: 3, fontSize: 22, fontWeight: 800, borderRadius: 10, padding: '5px 0',
                background: p.finished ? 'transparent' : active ? 'var(--amber)' : '#232b38',
                color: p.finished ? 'var(--green)' : active ? '#221803' : 'var(--text)',
                boxShadow: tappable ? '0 1px 0 rgba(0,0,0,.3)' : 'none' }}>
                {p.finished ? '✓' : label}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(p.playerId)}{p.finished ? ' 🏆' : ''}</span>
                {tappable && <span style={{ fontSize: 10, color: 'var(--amber)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>· Tap = Treffer</span>}
              </div>
              <div style={{ height: 7, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${(p.progress / total) * 100}%`, height: '100%', background: p.finished ? 'var(--green)' : active ? 'var(--amber)' : '#5b6472' }} />
              </div>
            </div>
            <div style={{ flex: '0 0 40px', textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{p.progress}/{total}</div>
          </button>
        );
      })}
    </div>
  );
}
