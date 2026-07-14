export type MulValue = 1 | 2 | 3 | 'miss';
export function Multiplier({ value, onChange }: { value: MulValue; onChange: (v: MulValue) => void }) {
  const items: { v: MulValue; label: string }[] = [
    { v: 1, label: 'Single' }, { v: 2, label: 'Double' }, { v: 3, label: 'Triple' }, { v: 'miss', label: 'Miss' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {items.map(({ v, label }) => {
        const on = value === v;
        return (
          <button key={label} onClick={() => onChange(v)}
            style={{ height: 25, padding: '0 11px', borderRadius: 7, fontSize: 11, fontWeight: 700,
              background: on ? 'var(--amber)' : 'var(--card)', color: on ? '#221803' : (v === 'miss' ? 'var(--muted)' : '#c5d0e0'),
              border: `1px solid ${on ? 'var(--amber)' : 'var(--border)'}` }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
