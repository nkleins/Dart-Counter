import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dart, GameType, GameView } from './types.js';
import * as api from './api.js';

function wsUrl(slug: string): string {
  const base = import.meta.env.VITE_API_URL ?? '';
  if (base.startsWith('http')) return base.replace(/^http/, 'ws') + `/api/games/${slug}/ws`;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/api/games/${slug}/ws`;
}

export function useGame(slug: string) {
  const [view, setView] = useState<GameView | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;
    let ws: WebSocket;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      ws = new WebSocket(wsUrl(slug));
      ws.onmessage = (e) => setView(JSON.parse(e.data as string) as GameView);
      ws.onclose = () => {
        if (!closedRef.current) retry = setTimeout(connect, 1500); // Reconnect
      };
    };
    connect();
    return () => { closedRef.current = true; clearTimeout(retry); ws.close(); };
  }, [slug]);

  const throwDart = useCallback(async (dart: Dart) => { setView(await api.throwDart(slug, dart)); }, [slug]);
  const undo = useCallback(async () => { setView(await api.undo(slug)); }, [slug]);
  const join = useCallback(async (input: { name: string; catchUp: 'catchUp' | 'handicap' }) => { await api.joinGame(slug, input); }, [slug]);
  const extend = useCallback(async (duration: '1d' | '1w' | '1M') => {
    try {
      setView(await api.extendGame(slug, duration));
    } catch {
      // Häufigster Fall: Monats-Verlängerung ist ausgelastet (Server 429).
      alert('Verlängerung nicht möglich – die Monats-Verlängerung ist gerade ausgelastet. Bitte +1 Woche wählen.');
    }
  }, [slug]);
  const reset = useCallback(async (change?: { gameType: GameType; options: unknown }) => { setView(await api.resetGame(slug, change)); }, [slug]);

  return { view, throwDart, undo, join, extend, reset };
}
