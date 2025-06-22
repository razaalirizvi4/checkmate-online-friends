import { useState, useEffect, useRef, useCallback } from 'react';

export function useStockfish(onBestMove: (move: string) => void) {
  const [isReady, setIsReady] = useState(false);
  const stockfish = useRef<Worker | null>(null);

  const onMessage = useCallback((event: MessageEvent) => {
    const message = event.data;
    if (message.startsWith('bestmove')) {
      const bestMove = message.split(' ')[1];
      onBestMove(bestMove);
    }
  }, [onBestMove]);

  useEffect(() => {
    const worker = new Worker('/stockfish.js');
    stockfish.current = worker;

    worker.addEventListener('message', onMessage);

    worker.postMessage('uci');
    worker.postMessage('isready');
    
    const readyListener = (event: MessageEvent) => {
      if (event.data === 'readyok') {
        setIsReady(true);
        worker.removeEventListener('message', readyListener);
      }
    };
    worker.addEventListener('message', readyListener);

    return () => {
      worker.postMessage('quit');
      worker.removeEventListener('message', onMessage);
    };
  }, [onMessage]);

  const findBestMove = useCallback((fen: string, skillLevel = 20) => {
    if (stockfish.current && isReady) {
      stockfish.current.postMessage(`position fen ${fen}`);
      // skillLevel can be 0-20.
      stockfish.current.postMessage(`setoption name Skill Level value ${skillLevel}`);
      stockfish.current.postMessage('go depth 15');
    }
  }, [isReady]);

  return { isReady, findBestMove };
} 