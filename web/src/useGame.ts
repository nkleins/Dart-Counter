import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dart, GameView } from './types.js';
import * as api from './api.js';

function wsUrl(slug: string): string {
  const base = import.meta.env.VITE_API_URL ?? '';
  if (base.startsWith('http')) return base.replace(/^http/, 'ws') + `/api/games/${slug}/ws`;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/api/games/${slug}/ws`;
}

export function useGame(slug: string) {
  const [view, setView] = useState<GameView | null>(null);
  const [connected, setConnected] = useState(false);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;
    let ws: WebSocket;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      ws = new WebSocket(wsUrl(slug));
      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => setView(JSON.parse(e.data as string) as GameView);
      ws.onclose = () => {
        setConnected(false);
        if (!closedRef.current) retry = setTimeout(connect, 1500); // Reconnect
      };
    };
    connect();
    return () => { closedRef.current = true; clearTimeout(retry); ws.close(); };
  }, [slug]);

  const throwDart = useCallback(async (dart: Dart) => { setView(await api.throwDart(slug, dart)); }, [slug]);
  const undo = useCallback(async () => { setView(await api.undo(slug)); }, [slug]);
  const join = useCallback(async (input: { name: string; catchUp: 'catchUp' | 'handicap' }) => { await api.joinGame(slug, input); }, [slug]);
  const extend = useCallback(async (duration: '1d' | '1w' | '1M') => { setView(await api.extendGame(slug, duration)); }, [slug]);

  return { view, connected, throwDart, undo, join, extend };
}
