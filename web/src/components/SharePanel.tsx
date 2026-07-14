import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function SharePanel({ slug, onExtend }: { slug: string; expiresAt: number; onExtend: (d: '1d' | '1w' | '1M') => void }) {
  const url = `${location.origin}/g/${slug}`;
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 140 }).then(setQr).catch(() => {}); }, [url]);
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* egal */ } };

  return (
    <div style={{ textAlign: 'center', padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, textAlign: 'left', background: '#141922', border: '1px solid var(--border)', borderRadius: 11, padding: '12px 13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{url}</div>
        <button onClick={copy} style={{ background: copied ? 'var(--green)' : 'var(--amber)', color: '#221803', border: 'none', borderRadius: 11, padding: '0 16px', fontWeight: 800 }}>{copied ? 'Kopiert ✓' : 'Kopieren'}</button>
      </div>
      {qr && <img src={qr} alt="QR-Code" style={{ width: 140, height: 140, borderRadius: 14, background: '#fff', padding: 8 }} />}
      <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginTop: 16 }}>
        {(['1d', '1w', '1M'] as const).map((d) => (
          <button key={d} onClick={() => onExtend(d)} style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 9, padding: '8px 12px', fontWeight: 700 }}>
            +{d === '1d' ? '1 Tag' : d === '1w' ? '1 Woche' : '1 Monat'}
          </button>
        ))}
      </div>
    </div>
  );
}
