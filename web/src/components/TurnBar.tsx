import type { MatchSummary, PlayerMeta } from '../types.js';

/** Kompakte Zahlenreihe in Sitzreihenfolge, z. B. "2·1·0" bzw. "2–1" bei zwei Personen. */
function tally(players: PlayerMeta[], won: Record<string, number>): string {
  const nums = players.map((p) => won[p.id] ?? 0);
  return nums.length === 2 ? `${nums[0]}–${nums[1]}` : nums.join('·');
}

export function TurnBar({ name, dartsThrownThisTurn, dartsThisTurnTotal, onUndo, match, players }: {
  name: string; dartsThrownThisTurn: number; dartsThisTurnTotal: number; onUndo: () => void;
  match: MatchSummary; players: PlayerMeta[];
}) {
  const total = dartsThisTurnTotal || 3;
  const catchUp = total > 3;
  const showCounter = match.format.kind !== 'casual';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--amber)' }} />
      <span style={{ fontSize: 16, fontWeight: 700 }}><b style={{ color: 'var(--amber)' }}>{name}</b> ist dran</span>
      {showCounter && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10, fontSize: 12, color: 'var(--muted)' }}>
          {match.format.kind === 'match' && (
            <span style={{ color: 'var(--text)', fontWeight: 700 }}>{`Sets ${tally(players, match.setsWon)}`}</span>
          )}
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>{`Legs ${tally(players, match.legsWon)}`}</span>
        </span>
      )}
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button aria-label="Zurück" onClick={onUndo} style={{ width: 32, height: 31, borderRadius: 9, background: '#1c222d', border: '1px solid #2f3745', color: '#aeb8c8' }}>↶</button>
        <span style={{ fontSize: 12, color: catchUp ? 'var(--amber)' : 'var(--muted)' }}>
          {catchUp ? 'Aufholen ' : 'Dart '}{Math.min(dartsThrownThisTurn + 1, total)} / {total}
        </span>
      </span>
    </div>
  );
}
