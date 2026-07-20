import type { Dart, PlayerMeta, X01State } from '../../types.js';
import { Keypad } from '../Keypad.js';

export function X01Board({ state, players, onThrow }: { state: X01State; players: PlayerMeta[]; onThrow: (d: Dart) => void }) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        {state.players.map((p) => {
          const active = p.playerId === state.currentPlayerId;
          const showTurn = active && state.dartsThrownThisTurn > 0; // laufende Aufnahme
          return (
            <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', borderRadius: 10, marginBottom: 5,
              background: active ? '#14251b' : 'var(--card)', border: `1px solid ${active ? '#274b33' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontWeight: 700, color: active ? 'var(--amber)' : 'var(--text)' }}>{nameOf(p.playerId)}</span>
                {showTurn && (
                  <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>
                    Aufnahme {state.turnPoints} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {state.dartsThrownThisTurn}/{state.dartsThisTurnTotal}</span>
                  </span>
                )}
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 24, fontWeight: 800 }}>{p.remaining}</span>
            </div>
          );
        })}
      </div>
      <Keypad onThrow={onThrow} checkout={state.checkout} />
    </div>
  );
}
