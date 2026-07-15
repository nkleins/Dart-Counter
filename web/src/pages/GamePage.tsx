import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../useGame.js';
import { TurnBar } from '../components/TurnBar.js';
import { HistoryTab } from '../components/HistoryTab.js';
import { X01Board } from '../components/boards/X01Board.js';
import { CricketBoard } from '../components/boards/CricketBoard.js';
import { AtcBoard } from '../components/boards/AtcBoard.js';
import { SharePanel } from '../components/SharePanel.js';
import { WinPopup } from '../components/WinPopup.js';
import { FinishActions } from '../components/FinishActions.js';
import type { GameType, PlayerMeta, X01State, CricketState, AtcState } from '../types.js';

export function GamePage() {
  const { slug = '' } = useParams();
  const nav = useNavigate();
  const { view, undo, throwDart, join, extend, reset } = useGame(slug);
  const [tab, setTab] = useState<'board' | 'history'>('board');
  const [showWin, setShowWin] = useState(true);

  if (!view) return <div style={{ padding: 20 }}>Lädt…</div>;

  const nameOf = (id: string | null): string => view.players.find((p: PlayerMeta) => p.id === id)?.name ?? '—';

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 16 }}>
      <TurnBar name={nameOf(view.state.currentPlayerId)} dartsThrownThisTurn={view.state.dartsThrownThisTurn} dartsThisTurnTotal={view.state.dartsThisTurnTotal} onUndo={undo} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab('board')} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: tab === 'board' ? 'var(--card)' : 'transparent', color: 'var(--text)' }}>Board</button>
        <button onClick={() => setTab('history')} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: tab === 'history' ? 'var(--card)' : 'transparent', color: 'var(--text)' }}>Verlauf &amp; Settings</button>
      </div>

      {tab === 'history' ? <HistoryTab view={view} onJoin={join} onExtend={extend} onHome={() => nav('/')} /> : (
        view.gameType === 'x01' ? <X01Board state={view.state as X01State} players={view.players} onThrow={throwDart} />
        : view.gameType === 'cricket' ? <CricketBoard state={view.state as CricketState} players={view.players} onThrow={throwDart} />
        : <AtcBoard state={view.state as AtcState} players={view.players} onThrow={throwDart} />
      )}

      {view.status === 'lobby' && <SharePanel slug={view.slug} />}

      {view.state.finished && view.state.winnerId && (
        <FinishActions
          onRestart={() => { setShowWin(true); setTab('board'); reset(); }}
          onChangeMode={(gameType: GameType, options: unknown) => { setShowWin(true); setTab('board'); reset({ gameType, options }); }}
          onHome={() => nav('/')}
        />
      )}

      {view.state.finished && view.state.winnerId && showWin && (
        <WinPopup
          winnerName={view.players.find((p) => p.id === view.state.winnerId)?.name ?? '—'}
          onUndo={() => { setShowWin(true); undo(); }}
          onClose={() => setShowWin(false)}
        />
      )}
    </div>
  );
}
