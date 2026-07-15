import { useState } from 'react';
import type { GameType } from '../types.js';
import { GameOptionsPicker } from './GameOptionsPicker.js';

export function FinishActions({ onRestart, onChangeMode, onHome }: {
  onRestart: () => void;
  onChangeMode: (gameType: GameType, options: unknown) => void;
  onHome: () => void;
}) {
  const [pick, setPick] = useState(false);
  const [cfg, setCfg] = useState<{ gameType: GameType; options: unknown }>({ gameType: 'x01', options: { start: 501, in: 'straight', out: 'double' } });

  const primary: React.CSSProperties = { width: '100%', background: 'var(--amber)', color: '#221803', border: 'none', borderRadius: 11, padding: 13, fontWeight: 800 };
  const secondary: React.CSSProperties = { width: '100%', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 11, padding: 13, fontWeight: 700 };

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!pick ? (
        <>
          <button onClick={onRestart} style={primary}>Neustarten</button>
          <button onClick={() => setPick(true)} style={secondary}>Modus wechseln</button>
          <button onClick={onHome} style={secondary}>Zurück zum Hauptmenü</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 4 }}>Neuer Modus – gleiche Spieler*innen, gleicher Link</div>
          <GameOptionsPicker onChange={(gameType, options) => setCfg({ gameType, options })} />
          <button onClick={() => onChangeMode(cfg.gameType, cfg.options)} style={{ ...primary, marginTop: 6 }}>Neues Spiel starten →</button>
          <button onClick={() => setPick(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontWeight: 700, padding: 6 }}>← Zurück</button>
        </>
      )}
    </div>
  );
}
