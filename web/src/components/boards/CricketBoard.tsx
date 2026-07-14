import { useState } from 'react';
import type { CricketState, Dart, PlayerMeta } from '../../types.js';
import { Multiplier, type MulValue } from '../Multiplier.js';

const ORDER = [15, 16, 17, 18, 19, 20, 25]; // aufsteigend, Bull unten
const symbol = (m: number) => (m >= 3 ? 'Ⓧ' : m === 2 ? '✕' : m === 1 ? '╱' : '·');
const targetLabel = (t: number) => (t === 25 ? 'B' : String(t));

export function CricketBoard({ state, players, onThrow }: { state: CricketState; players: PlayerMeta[]; onThrow: (d: Dart) => void }) {
  const [mul, setMul] = useState<MulValue>(1);
  const rows = ORDER.filter((t) => state.targets.includes(t));
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const stateOf = (id: string) => state.players.find((p) => p.playerId === id);

  const fire = (t: number) => { onThrow({ segment: t, multiplier: mul === 'miss' ? 1 : mul }); setMul(1); };
  const onMul = (v: MulValue) => { if (v === 'miss') { onThrow({ segment: 0, multiplier: 0 }); } else setMul(v); };

  const cell: React.CSSProperties = { height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, border: '1px solid var(--border)' };

  return (
    <div>
      <div style={{ marginBottom: 14 }}><Multiplier value={mul} onChange={onMul} /></div>
      <div style={{ display: 'flex' }}>
        {/* fixe Zahlen-Spalte */}
        <div style={{ flex: '0 0 40px', display: 'grid', gridTemplateRows: `30px repeat(${rows.length}, 38px) 46px`, rowGap: 6 }}>
          <div />
          {rows.map((t) => {
            const dead = state.deadTargets.includes(t);
            return <div key={t} data-testid={`numlabel-${t}`} data-dead={dead ? 'true' : 'false'}
              style={{ display: 'flex', alignItems: 'center', fontWeight: 800, color: dead ? 'var(--red)' : '#c5d0e0', textDecoration: dead ? 'line-through' : 'none' }}>
              {targetLabel(t)}
            </div>;
          })}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>Pkt</div>
        </div>
        {/* scrollbare Spieler-Spalten */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 5, paddingLeft: 6, width: 'max-content' }}>
            {players.map((p) => {
              const ps = stateOf(p.id);
              const active = p.id === state.currentPlayerId;
              return (
                <div key={p.id} style={{ flex: '0 0 62px', display: 'grid', gridTemplateRows: `30px repeat(${rows.length}, 38px) 46px`, rowGap: 6 }}>
                  <div title={nameOf(p.id)} style={{ textAlign: 'center', fontWeight: 800, lineHeight: '30px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: active ? 'var(--amber)' : '#cbd4e2' }}>{nameOf(p.id)}</div>
                  {rows.map((t) => {
                    const m = ps?.marks[t] ?? 0;
                    const dead = state.deadTargets.includes(t);
                    const bg = dead ? 'var(--red)' : m >= 3 ? 'var(--green)' : 'var(--card)';
                    const color = dead ? '#2a0d0c' : m >= 3 ? '#062012' : m > 0 ? 'var(--text)' : '#4c576b';
                    const clickable = active && !dead;
                    return (
                      <div key={t} data-testid={`cell-${p.id}-${t}`} onClick={clickable ? () => fire(t) : undefined}
                        style={{ ...cell, background: bg, color, cursor: clickable ? 'pointer' : 'default', margin: '0 3px',
                          boxShadow: active && !dead && m < 3 ? 'inset 0 0 0 1px rgba(245,181,68,.15)' : 'none' }}>
                        {symbol(m)}
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, color: active ? 'var(--amber)' : 'var(--text)' }}>{ps?.score ?? 0}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
