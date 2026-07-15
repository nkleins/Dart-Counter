export type MulValue = 1 | 2 | 3 | 'miss';
export function Multiplier({ value, onChange }: { value: MulValue; onChange: (v: MulValue) => void }) {
  const mults: { v: MulValue; label: string }[] = [
    { v: 1, label: 'Single' }, { v: 2, label: 'Double' }, { v: 3, label: 'Triple' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
      {/* Miss: kleine Version der antippbaren Board-Buttons, bewusst abgesetzt von den Multiplikator-Pills */}
      <button onClick={() => onChange('miss')}
        style={{ height: 30, padding: '0 15px', borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: '#161f30', color: '#c5d0e0', border: '1px solid var(--border)' }}>
        Miss
      </button>
      <div style={{ display: 'flex', gap: 6 }}>
        {mults.map(({ v, label }) => {
          const on = value === v;
          return (
            <button key={label} onClick={() => onChange(v)}
              style={{ height: 25, padding: '0 11px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                background: on ? 'var(--amber)' : 'var(--card)', color: on ? '#221803' : '#c5d0e0',
                border: `1px solid ${on ? 'var(--amber)' : 'var(--border)'}` }}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
