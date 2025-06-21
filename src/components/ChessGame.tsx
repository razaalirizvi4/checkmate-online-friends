
import React, { useState, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import GameInfo from './GameInfo';
import { initialBoard, ChessPiece, Position, GameState } from '../utils/chessUtils';
import { isValidMove, makeMove } from '../utils/chessLogic';

const ChessGame = () => {
  const [board, setBoard] = useState<(ChessPiece | null)[][]>(initialBoard);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [gameState, setGameState] = useState<GameState>('playing');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<{
    white: ChessPiece[];
    black: ChessPiece[];
  }>({ white: [], black: [] });

  const handleSquareClick = useCallback((position: Position) => {
    if (gameState !== 'playing') return;

    if (selectedSquare) {
      const piece = board[selectedSquare.row][selectedSquare.col];
      
      if (piece && piece.color === currentPlayer) {
        if (isValidMove(board, selectedSquare, position, piece)) {
          const result = makeMove(board, selectedSquare, position);
          
          if (result.capturedPiece) {
            setCapturedPieces(prev => ({
              ...prev,
              [result.capturedPiece!.color]: [...prev[result.capturedPiece!.color], result.capturedPiece!]
            }));
          }
          
          setBoard(result.newBoard);
          setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
          setMoveHistory(prev => [...prev, result.moveNotation]);
          
          if (result.gameState) {
            setGameState(result.gameState);
          }
        }
      }
      setSelectedSquare(null);
    } else {
      const piece = board[position.row][position.col];
      if (piece && piece.color === currentPlayer) {
        setSelectedSquare(position);
      }
    }
  }, [board, selectedSquare, currentPlayer, gameState]);

  const resetGame = () => {
    setBoard(initialBoard);
    setSelectedSquare(null);
    setCurrentPlayer('white');
    setGameState('playing');
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
      <div className="flex-shrink-0">
        <ChessBoard
          board={board}
          selectedSquare={selectedSquare}
          onSquareClick={handleSquareClick}
          currentPlayer={currentPlayer}
        />
      </div>
      <div className="w-full lg:w-80">
        <GameInfo
          currentPlayer={currentPlayer}
          gameState={gameState}
          moveHistory={moveHistory}
          capturedPieces={capturedPieces}
          onReset={resetGame}
        />
      </div>
    </div>
  );
};

export default ChessGame;
