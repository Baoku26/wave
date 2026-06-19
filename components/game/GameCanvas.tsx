'use client';

import { useEffect, useRef, useState } from 'react';
import { EventBus } from '@/game/EventBus';
import type { OHLCCandle, RunCompletePayload, ScoreUpdatePayload, TrickEvent } from '@/game/index';

interface GameCanvasProps {
  eraId: string;
  token: string;
  candles: OHLCCandle[];
  playerAddress: string;
  onRunComplete: (result: RunCompletePayload) => void;
  onScoreUpdate?: (update: ScoreUpdatePayload) => void;
  onTrickLanded?: (trick: TrickEvent) => void;
}

export function GameCanvas({
  eraId,
  token,
  candles,
  playerAddress,
  onRunComplete,
  onScoreUpdate,
  onTrickLanded,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;
    if (gameRef.current) return;

    let mounted = true;

    import('@/game/index').then(({ createGame }) => {
      if (!mounted || !containerRef.current) return;

      const game = createGame(containerRef.current);
      gameRef.current = game;

      EventBus.once('game-ready', () => {
        if (!mounted) return;
        setIsReady(true);
      });

      // Emit start-run only after GameScene.create() has registered its listener.
      // Store the handler so cleanup can remove it if the component unmounts before
      // the scene fires (prevents stale listener from a destroyed game calling startRun).
      const onGameSceneReady = () => {
        if (!mounted) return;
        EventBus.emit('start-run', { eraId, token, candles, playerAddress });
      };
      EventBus.once('game-scene-ready', onGameSceneReady);

      EventBus.on('run-complete', onRunComplete);
      if (onScoreUpdate) EventBus.on('score-update', onScoreUpdate);
      if (onTrickLanded) EventBus.on('trick-landed', onTrickLanded);

      cleanupRef.current = () => {
        EventBus.off('game-scene-ready', onGameSceneReady);
        EventBus.off('run-complete', onRunComplete);
        if (onScoreUpdate) EventBus.off('score-update', onScoreUpdate);
        if (onTrickLanded) EventBus.off('trick-landed', onTrickLanded);
      };
    });

    return () => {
      mounted = false;
      // Eagerly remove game-scene listeners before the async game.destroy(true).
      // game.destroy queues shutdown for the next RAF frame, so GameScene.shutdown()
      // (which calls EventBus.off) won't run until the next frame. If a new game
      // starts in the same frame, its game-scene-ready fires and the stale
      // start-run listener from the old scene reaches a half-destroyed surfer.
      EventBus.removeAllListeners('start-run');
      EventBus.removeAllListeners('wipeout');
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden rounded-xl"
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#f7931a] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#555555] tracking-wide">Loading chart...</span>
          </div>
        </div>
      )}
    </div>
  );
}
