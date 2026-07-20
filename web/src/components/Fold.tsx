import { useState } from 'react';

/** Einklappbarer Karten-Bereich: Kopfzeile mit Label · Summary · Chevron, Inhalt bei Bedarf. */
export function Fold({ label, summary, defaultOpen = false, children }: {
  label: string; summary: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 12,
          background: 'none', border: 'none', color: 'var(--text)', textAlign: 'left' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--amber)' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, textAlign: 'right' }}>{summary}</span>
        <span aria-hidden style={{ color: 'var(--muted)', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>
      {open && <div style={{ padding: '0 12px 12px' }}>{children}</div>}
    </div>
  );
}
