import { useRef, useState } from 'react';
import type { Dart } from '../types.js';
import { Multiplier, type MulValue } from './Multiplier.js';

export function Keypad({ onThrow }: { onThrow: (dart: Dart) => void }) {
  const [mul, setMul] = useState<MulValue>(1);
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Kurzes Aufblitzen der getippten Taste als Bestätigung.
  const doFlash = (id: string) => {
    setFlash(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash((f) => (f === id ? null : f)), 220);
  };

  const fire = (id: string, segment: number, multiplier: number) => { doFlash(id); onThrow({ segment, multiplier }); setMul(1); };
  const onMul = (v: MulValue) => { if (v === 'miss') fire('miss', 0, 0); else setMul(v); };
  const numbers = Array.from({ length: 20 }, (_, i) => i + 1);

  const key: React.CSSProperties = { padding: '12px 0', borderRadius: 10, background: '#161f30', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 700, fontSize: 16, transition: 'background 120ms, border-color 120ms' };
  const hit = (id: string): React.CSSProperties => flash === id
    ? { background: 'var(--amber)', border: '1px solid var(--amber)', color: '#221803' }
    : {};

  return (
    <div>
      <div style={{ marginBottom: 9 }}><Multiplier value={mul} onChange={onMul} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 7 }}>
        {numbers.map((n) => {
          const id = `n${n}`;
          return <button key={n} className={flash === id ? 'dart-flash' : undefined} style={{ ...key, ...hit(id) }} onClick={() => fire(id, n, mul === 'miss' ? 1 : mul)}>{n}</button>;
        })}
        <button className={flash === 's25' ? 'dart-flash' : undefined} style={{ ...key, ...hit('s25') }} onClick={() => fire('s25', 25, 1)}>25</button>
        <button className={flash === 'bull' ? 'dart-flash' : undefined} style={{ ...key, color: '#ff8f8f', ...hit('bull') }} onClick={() => fire('bull', 25, 2)}>Bull</button>
      </div>
    </div>
  );
}
