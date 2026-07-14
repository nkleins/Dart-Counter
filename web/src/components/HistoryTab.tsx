import type { GameView, PlayerMeta } from '../types.js';

export function HistoryTab({ view }: { view: GameView }) {
  const nameOf = (id: string) => view.players.find((p: PlayerMeta) => p.id === id)?.name ?? id;
  const label = (seg: number, mul: number) => seg === 0 ? 'Miss' : seg === 25 ? (mul === 2 ? 'Bull(50)' : 'Bull(25)') : `${['', 'S', 'D', 'T'][mul]}${seg}`;
  return (
    <div>
      {[...view.history].reverse().map((e) => (
        <div key={e.seq} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 4px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>#{e.seq}</span>
          <span>{nameOf(e.playerId)}</span>
          <span style={{ fontWeight: 700 }}>{label(e.segment, e.multiplier)}</span>
        </div>
      ))}
      {view.history.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Noch keine Würfe.</p>}
    </div>
  );
}
