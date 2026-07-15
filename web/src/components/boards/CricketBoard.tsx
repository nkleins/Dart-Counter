import { useRef, useState } from 'react';
import type { CricketState, Dart, PlayerMeta } from '../../types.js';
import { Multiplier, type MulValue } from '../Multiplier.js';

const ORDER = [15, 16, 17, 18, 19, 20, 25]; // aufsteigend, Bull unten
const symbol = (m: number) => (m >= 3 ? 'Ⓧ' : m === 2 ? '✕' : m === 1 ? '╱' : '·');
const targetLabel = (t: number) => (t === 25 ? 'B' : String(t));
const CELL = 44; // größere Tap-Ziele auf dem Handy

export function CricketBoard({ state, players, onThrow }: { state: CricketState; players: PlayerMeta[]; onThrow: (d: Dart) => void }) {
  const [mul, setMul] = useState<MulValue>(1);
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const rows = ORDER.filter((t) => state.targets.includes(t));
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const stateOf = (id: string) => state.players.find((p) => p.playerId === id);

  const doFlash = (id: string) => {
    setFlash(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash((f) => (f === id ? null : f)), 220);
  };
  const fire = (pid: string, t: number) => { doFlash(`${pid}-${t}`); onThrow({ segment: t, multiplier: mul === 'miss' ? 1 : mul }); setMul(1); };
  const onMul = (v: MulValue) => { if (v === 'miss') { onThrow({ segment: 0, multiplier: 0 }); } else setMul(v); };

  const template = `30px repeat(${rows.length}, ${CELL}px) 46px`;
  const cell: React.CSSProperties = { height: CELL, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, border: '1px solid var(--border)', padding: 0, transition: 'background 120ms, border-color 120ms' };

  return (
    <div style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
      <div style={{ marginBottom: 14 }}><Multiplier value={mul} onChange={onMul} /></div>
      <div style={{ display: 'flex', gap: 6 }}>
        {/* fixe Zahlen-Spalte */}
        <div style={{ flex: '0 0 30px', display: 'grid', gridTemplateRows: template, rowGap: 6 }}>
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
        {/* Spieler-Spalten füllen die verfügbare Breite (scrollt erst bei vielen Spieler*innen) */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${players.length}, minmax(56px, 1fr))`, gap: 5, minWidth: '100%' }}>
            {players.map((p) => {
              const ps = stateOf(p.id);
              const active = p.id === state.currentPlayerId;
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateRows: template, rowGap: 6 }}>
                  <div title={nameOf(p.id)} style={{ textAlign: 'center', fontWeight: 800, lineHeight: '30px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: active ? 'var(--amber)' : '#cbd4e2' }}>{nameOf(p.id)}</div>
                  {rows.map((t) => {
                    const m = ps?.marks[t] ?? 0;
                    const dead = state.deadTargets.includes(t);
                    const bg = dead ? 'var(--red)' : m >= 3 ? 'var(--green)' : 'var(--card)';
                    const color = dead ? '#2a0d0c' : m >= 3 ? '#062012' : m > 0 ? 'var(--text)' : '#4c576b';
                    const clickable = active && !dead;
                    const id = `${p.id}-${t}`;
                    return (
                      <button key={t} data-testid={`cell-${p.id}-${t}`} disabled={!clickable}
                        className={flash === id ? 'dart-flash' : undefined}
                        onClick={clickable ? () => fire(p.id, t) : undefined}
                        style={{ ...cell, background: bg, color, cursor: clickable ? 'pointer' : 'default',
                          boxShadow: active && !dead && m < 3 ? 'inset 0 0 0 1px rgba(245,181,68,.15)' : 'none' }}>
                        {symbol(m)}
                      </button>
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
