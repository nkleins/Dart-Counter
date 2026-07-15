import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function SharePanel({ slug }: { slug: string }) {
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
    </div>
  );
}
