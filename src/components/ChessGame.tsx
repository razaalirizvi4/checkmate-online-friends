import React, { useState, useCallback, useEffect, useRef } from 'react';
import ChessBoard from './ChessBoard';
import GameInfo from './GameInfo';
import { initialBoard, ChessPiece, Position, GameState } from '../utils/chessUtils';
import { isValidMove, makeMove, isKingInCheck, boardToFen } from '../utils/chessLogic';
import { useStockfish } from '../hooks/useStockfish';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');

  const stateRef = useRef({ board, playerColor, gameState });
  useEffect(() => {
    stateRef.current = { board, playerColor, gameState };
  });

  const handleBestMove = useCallback((bestMove: string) => {
    const { board, playerColor, gameState } = stateRef.current;
    
    if (gameState !== 'playing' || !isAiEnabled) return;
    
    const from = bestMove.substring(0, 2);
    const to = bestMove.substring(2, 4);

    const fromRow = 8 - parseInt(from[1]);
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);

    const fromPos = { row: fromRow, col: fromCol };
    const toPos = { row: toRow, col: toCol };
    
    const piece = board[fromPos.row][fromPos.col];

    if (piece && piece.color !== playerColor) {
      const result = makeMove(board, fromPos, toPos);
          
      if (result.capturedPiece) {
        setCapturedPieces(prev => ({
          ...prev,
          [result.capturedPiece!.color]: [...prev[result.capturedPiece!.color], result.capturedPiece!]
        }));
      }
      
      setBoard(result.newBoard);
      setCurrentPlayer(playerColor);
      setMoveHistory(prev => [...prev, result.moveNotation]);
      
      if (result.gameState) {
        setGameState(result.gameState);
      }
    }
  }, [isAiEnabled]);
  
  const { isReady, findBestMove } = useStockfish(handleBestMove);

  // Calculate valid moves for the selected piece
  const getValidMovesForSelectedPiece = useCallback((): Position[] => {
    if (!selectedSquare || gameState !== 'playing') {
      return [];
    }

    const piece = board[selectedSquare.row][selectedSquare.col];
    if (!piece || piece.color !== currentPlayer) {
      return [];
    }

    const validMoves: Position[] = [];
    
    // Check all squares on the board
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const targetPosition = { row, col };
        if (isValidMove(board, selectedSquare, targetPosition, piece)) {
          // Check if this move would put or leave the king in check
          const newBoard = board.map(row => row.map(piece => piece ? { ...piece } : null));
          newBoard[targetPosition.row][targetPosition.col] = { ...piece, hasMoved: true };
          newBoard[selectedSquare.row][selectedSquare.col] = null;
          
          // Check if the king would be in check after this move
          const isInCheck = isKingInCheck(newBoard, piece.color);
          if (!isInCheck) {
            validMoves.push(targetPosition);
          }
        }
      }
    }

    return validMoves;
  }, [selectedSquare, board, currentPlayer, gameState]);

  const handleSquareClick = useCallback((position: Position) => {
    if (gameState !== 'playing' || (isAiEnabled && currentPlayer !== playerColor)) return;

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
          const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
          setCurrentPlayer(nextPlayer);
          setMoveHistory(prev => [...prev, result.moveNotation]);
          
          if (result.gameState) {
            setGameState(result.gameState);
          } else if (isAiEnabled && nextPlayer !== playerColor) {
            const fen = boardToFen(result.newBoard, nextPlayer);
            findBestMove(fen, 10);
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
  }, [board, selectedSquare, currentPlayer, gameState, isAiEnabled, playerColor, findBestMove]);

  const resetGame = () => {
    setBoard(initialBoard);
    setSelectedSquare(null);
    const newPlayerColor = playerColor === 'white' ? 'black' : 'white';
    setPlayerColor(newPlayerColor);
    setCurrentPlayer('white');
    setGameState('playing');
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
  };

  useEffect(() => {
    if (isAiEnabled && currentPlayer !== playerColor && gameState === 'playing') {
      const fen = boardToFen(board, currentPlayer);
      findBestMove(fen, 10);
    }
  }, [isAiEnabled, currentPlayer, playerColor, gameState, board, findBestMove]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
      <div className="flex-shrink-0">
        <ChessBoard
          board={board}
          selectedSquare={selectedSquare}
          onSquareClick={handleSquareClick}
          currentPlayer={currentPlayer}
          validMoves={getValidMovesForSelectedPiece()}
        />
        <div className="flex items-center space-x-2 mt-4">
          <Switch
            id="ai-mode"
            checked={isAiEnabled}
            onCheckedChange={setIsAiEnabled}
          />
          <Label htmlFor="ai-mode">Play against AI ({isReady ? "Ready" : "Loading..."})</Label>
        </div>
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
