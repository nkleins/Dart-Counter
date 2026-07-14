import { useState } from 'react';
import type { Dart } from '../types.js';
import { Multiplier, type MulValue } from './Multiplier.js';

export function Keypad({ onThrow }: { onThrow: (dart: Dart) => void }) {
  const [mul, setMul] = useState<MulValue>(1);

  const fire = (segment: number, multiplier: number) => { onThrow({ segment, multiplier }); setMul(1); };
  const onMul = (v: MulValue) => { if (v === 'miss') fire(0, 0); else setMul(v); };
  const numbers = Array.from({ length: 20 }, (_, i) => i + 1);

  const key: React.CSSProperties = { padding: '12px 0', borderRadius: 10, background: '#161f30', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 700, fontSize: 16 };

  return (
    <div>
      <div style={{ marginBottom: 9 }}><Multiplier value={mul} onChange={onMul} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 7 }}>
        {numbers.map((n) => <button key={n} style={key} onClick={() => fire(n, mul === 'miss' ? 1 : mul)}>{n}</button>)}
        <button style={key} onClick={() => fire(25, 1)}>25</button>
        <button style={{ ...key, color: '#ff8f8f' }} onClick={() => fire(25, 2)}>Bull</button>
      </div>
    </div>
  );
}
