export function LegBanner({ winnerName, legsText, label = 'Leg an' }: { winnerName: string; legsText: string; label?: string }) {
  return (
    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
      background: '#14251b', border: '1px solid #274b33' }}>
      <span style={{ fontSize: 18 }}>🎯</span>
      <span style={{ fontWeight: 700 }}>{label} <b style={{ color: 'var(--amber)' }}>{winnerName}</b></span>
      <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{legsText}</span>
    </div>
  );
}
