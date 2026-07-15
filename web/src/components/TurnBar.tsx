export function TurnBar({ name, dartsThrownThisTurn, dartsThisTurnTotal, onUndo }: { name: string; dartsThrownThisTurn: number; dartsThisTurnTotal: number; onUndo: () => void }) {
  const total = dartsThisTurnTotal || 3;
  const catchUp = total > 3;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--amber)' }} />
      <span style={{ fontSize: 16, fontWeight: 700 }}><b style={{ color: 'var(--amber)' }}>{name}</b> ist dran</span>
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button aria-label="Zurück" onClick={onUndo} style={{ width: 32, height: 31, borderRadius: 9, background: '#1c222d', border: '1px solid #2f3745', color: '#aeb8c8' }}>↶</button>
        <span style={{ fontSize: 12, color: catchUp ? 'var(--amber)' : 'var(--muted)' }}>
          {catchUp ? 'Aufholen ' : 'Dart '}{Math.min(dartsThrownThisTurn + 1, total)} / {total}
        </span>
      </span>
    </div>
  );
}
