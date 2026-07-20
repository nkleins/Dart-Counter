import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameType } from '../types.js';
import { createGame } from '../api.js';
import { GameOptionsPicker } from '../components/GameOptionsPicker.js';

// Zuletzt eingetragene Spielernamen lokal merken (gleiches Gerät, nächster Besuch).
const PLAYERS_KEY = 'dc:createPlayers';
function readPlayers(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(PLAYERS_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 8) : [];
  } catch { return []; }
}

export function CreatePage() {
  const nav = useNavigate();
  const [gameType, setGameType] = useState<GameType>('x01');
  const [options, setOptions] = useState<unknown>({ start: 501, in: 'straight', out: 'double' });
  const [players, setPlayers] = useState<string[]>(readPlayers);
  const [name, setName] = useState('');

  useEffect(() => {
    try { localStorage.setItem(PLAYERS_KEY, JSON.stringify(players)); } catch { /* Storage n/a */ }
  }, [players]);

  const addPlayer = () => {
    const n = name.trim().slice(0, 14);
    if (n) { setPlayers((p) => [...p, n]); setName(''); }
  };

  const submit = async () => {
    if (players.length === 0) return;
    const { slug } = await createGame({ gameType, options, players });
    nav(`/g/${slug}`);
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <h1>Neues Spiel</h1>

      <div style={{ marginBottom: 20 }}>
        <GameOptionsPicker onChange={(gt, opts) => { setGameType(gt); setOptions(opts); }} />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 9 }}>Spieler*innen</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
          {players.map((p, i) => (
            <div key={i} style={{ background: '#141922', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', display: 'flex' }}>
              <span style={{ flex: 1 }}>{p}</span>
              <span style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => setPlayers((ps) => ps.filter((_, j) => j !== i))}>✕</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Name hinzufügen…" value={name} maxLength={14}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addPlayer(); }}
            style={{ flex: 1, background: '#141922', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', color: 'var(--text)' }} />
          <button onClick={addPlayer} style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '0 16px', fontWeight: 700 }}>+ Add</button>
        </div>
      </div>

      <button onClick={submit} disabled={players.length === 0}
        style={{ width: '100%', background: 'var(--amber)', color: '#221803', border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 800,
          opacity: players.length === 0 ? 0.45 : 1, cursor: players.length === 0 ? 'not-allowed' : 'pointer' }}>
        Spiel erstellen →
      </button>
      {players.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 10 }}>Füge mindestens eine*n Spieler*in hinzu.</p>
      )}
    </div>
  );
}
