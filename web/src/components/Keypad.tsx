import { useRef, useState } from 'react';
import type { Dart } from '../types.js';
import { Multiplier, type MulValue } from './Multiplier.js';

const CHECKOUT_KEY = 'dc:showCheckout';
const readCheckoutPref = (): boolean => { try { return localStorage.getItem(CHECKOUT_KEY) !== '0'; } catch { return true; } };
const writeCheckoutPref = (v: boolean): void => { try { localStorage.setItem(CHECKOUT_KEY, v ? '1' : '0'); } catch { /* Storage nicht verfügbar */ } };

export function Keypad({ onThrow, checkout = null }: { onThrow: (dart: Dart) => void; checkout?: string[] | null }) {
  const [mul, setMul] = useState<MulValue>(1);
  const [flash, setFlash] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(readCheckoutPref);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const toggleCheckout = () => setShowCheckout((v) => { const next = !v; writeCheckoutPref(next); return next; });

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <div style={{ flex: 1 }}><Multiplier value={mul} onChange={onMul} /></div>
        <button onClick={toggleCheckout} title="Checkout-Vorschläge an/aus"
          style={{ height: 25, padding: '0 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            background: showCheckout ? 'var(--amber)' : 'var(--card)', color: showCheckout ? '#221803' : '#c5d0e0',
            border: `1px solid ${showCheckout ? 'var(--amber)' : 'var(--border)'}` }}>
          Checkout
        </button>
      </div>
      {showCheckout && checkout && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, padding: '8px 12px', borderRadius: 10,
          background: '#14251b', border: '1px solid #274b33' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Checkout</span>
          <span style={{ fontWeight: 800, color: 'var(--amber)', letterSpacing: 0.5 }}>{checkout.join(' · ')}</span>
        </div>
      )}
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
