import { useEffect, useRef } from 'react';

const COLORS = ['#f5b544', '#46d38a', '#f2645f', '#5b8cff', '#ffffff', '#e879f9'];

export function WinPopup({ winnerName, onUndo, onClose }: { winnerName: string; onUndo: () => void; onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      const w = 5 + Math.random() * 6;
      Object.assign(p.style, {
        position: 'absolute', top: '-14px', left: `${Math.random() * 100}%`, width: `${w}px`, height: `${w * 1.6}px`,
        background: COLORS[(Math.random() * COLORS.length) | 0], opacity: '0.9',
        transform: `rotate(${Math.random() * 360}deg)`, borderRadius: '1px',
        transition: `transform ${1.6 + Math.random() * 1.6}s linear, top ${1.6 + Math.random() * 1.6}s linear`,
      } as CSSStyleDeclaration);
      el.appendChild(p);
      requestAnimationFrame(() => { p.style.top = '110%'; p.style.transform = `translateY(0) rotate(720deg)`; });
      setTimeout(() => p.remove(), 3600);
    }
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,14,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div ref={host} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', width: 270, background: 'var(--card)', border: '1px solid #2f3745', borderRadius: 20, padding: '24px 22px 20px', textAlign: 'center' }}>
        <button aria-label="Fehltipp – zurück" onClick={onUndo}
          style={{ position: 'absolute', top: 12, right: 12, background: '#232c3a', border: '1px solid #384354', color: '#aeb8c8', borderRadius: 8, padding: '5px 8px', fontSize: 10, fontWeight: 700 }}>↶ Fehltipp</button>
        <div style={{ fontSize: 44 }}>🎯</div>
        <h3 style={{ margin: '6px 0 4px', fontSize: 22 }}><b style={{ color: 'var(--amber)' }}>{winnerName}</b> gewinnt!</h3>
        <button onClick={onClose} style={{ width: '100%', marginTop: 16, background: 'var(--amber)', color: '#221803', border: 'none', borderRadius: 11, padding: 12, fontWeight: 800 }}>Schließen</button>
      </div>
    </div>
  );
}
