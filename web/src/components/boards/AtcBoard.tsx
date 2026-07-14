import { useState } from 'react';
import type { AtcState, Dart, PlayerMeta } from '../../types.js';
import { Multiplier, type MulValue } from '../Multiplier.js';

export function AtcBoard({ state, players, onThrow }: { state: AtcState; players: PlayerMeta[]; onThrow: (d: Dart) => void }) {
  const [mul, setMul] = useState<MulValue>(1);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const onMul = (v: MulValue) => { if (v === 'miss') onThrow({ segment: 0, multiplier: 0 }); else setMul(v); };
  const total = state.sequence.length;

  return (
    <div>
      <div style={{ marginBottom: 14 }}><Multiplier value={mul} onChange={onMul} /></div>
      {state.players.map((p) => {
        const active = p.playerId === state.currentPlayerId;
        const label = p.target === null ? 'Fertig' : p.target === 25 ? 'Bull' : String(p.target);
        return (
          <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', borderRadius: 14, marginBottom: 9,
            background: p.finished ? '#12251a' : active ? '#211d13' : 'var(--card)', border: `1px solid ${p.finished ? 'var(--green)' : active ? 'var(--amber)' : 'var(--border)'}` }}>
            <div style={{ width: 52, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>{p.finished ? 'Fertig' : 'Ziel'}</div>
              <button disabled={!active || p.finished} onClick={() => p.target !== null && onThrow({ segment: p.target, multiplier: mul === 'miss' ? 1 : mul })}
                style={{ fontSize: 22, fontWeight: 800, background: 'none', border: 'none', color: p.finished ? 'var(--green)' : active ? 'var(--amber)' : 'var(--text)', cursor: active && !p.finished ? 'pointer' : 'default' }}>
                {p.finished ? '✓' : label}
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 7 }}>{nameOf(p.playerId)}{p.finished ? ' 🏆' : ''}</div>
              <div style={{ height: 7, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${(p.progress / total) * 100}%`, height: '100%', background: p.finished ? 'var(--green)' : active ? 'var(--amber)' : '#5b6472' }} />
              </div>
            </div>
            <div style={{ flex: '0 0 40px', textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{p.progress}/{total}</div>
          </div>
        );
      })}
    </div>
  );
}
