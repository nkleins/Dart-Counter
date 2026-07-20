import type { MatchSummary } from '../types.js';

export function TurnBar({ name, dartsThrownThisTurn, dartsThisTurnTotal, onUndo, match, activePlayerId }: {
  name: string; dartsThrownThisTurn: number; dartsThisTurnTotal: number; onUndo: () => void;
  match: MatchSummary; activePlayerId: string | null;
}) {
  const total = dartsThisTurnTotal || 3;
  const catchUp = total > 3;
  // Nur die Sets/Legs der Person zeigen, die gerade dran ist (Gesamtübersicht steckt in den Standings).
  const showCounter = match.format.kind !== 'casual' && !!activePlayerId;
  const legs = activePlayerId ? (match.legsWon[activePlayerId] ?? 0) : 0;
  const sets = activePlayerId ? (match.setsWon[activePlayerId] ?? 0) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--amber)' }} />
      <span style={{ fontSize: 16, fontWeight: 700 }}><b style={{ color: 'var(--amber)' }}>{name}</b> ist dran</span>
      {showCounter && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10, fontSize: 12, color: 'var(--muted)' }}>
          {match.format.kind === 'match' && (
            <span style={{ color: 'var(--text)', fontWeight: 700 }}>{`Sets ${sets}`}</span>
          )}
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>{`Legs ${legs}`}</span>
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
