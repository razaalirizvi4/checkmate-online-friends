import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ChessPiece, GameState } from '../utils/chessUtils';
import { cn } from '../lib/utils';

interface GameInfoProps {
  currentPlayer: 'white' | 'black';
  gameState: GameState;
  moveHistory: string[];
  capturedPieces: {
    white: ChessPiece[];
    black: ChessPiece[];
  };
  onReset: () => void;
}

const pieceSymbols: Record<string, string> = {
  'white-king': '♔',
  'white-queen': '♕',
  'white-rook': '♖',
  'white-bishop': '♗',
  'white-knight': '♘',
  'white-pawn': '♙',
  'black-king': '♚',
  'black-queen': '♛',
  'black-rook': '♜',
  'black-bishop': '♝',
  'black-knight': '♞',
  'black-pawn': '♟',
};

const GameInfo: React.FC<GameInfoProps> = ({
  currentPlayer,
  gameState,
  moveHistory,
  capturedPieces,
  onReset
}) => {
  const getGameStatusMessage = () => {
    switch (gameState) {
      case 'checkmate':
        return `${currentPlayer === 'white' ? 'Black' : 'White'} wins by checkmate!`;
      case 'stalemate':
      case 'draw':
        return 'Game ends in a draw!';
      case 'check':
        return `${currentPlayer} is in check!`;
      default:
        return `${currentPlayer === 'white' ? 'White' : 'Black'} to move`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Game Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Game Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(
            "text-lg font-semibold",
            gameState === 'checkmate' ? "text-red-400" :
            gameState === 'check' ? "text-yellow-400" :
            gameState === 'stalemate' || gameState === 'draw' ? "text-blue-400" :
            "text-green-400"
          )}>
            {getGameStatusMessage()}
          </p>
          <Button 
            onClick={onReset}
            className="mt-4 w-full bg-amber-600 hover:bg-amber-700"
          >
            New Game
          </Button>
        </CardContent>
      </Card>

      {/* Captured Pieces */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Captured Pieces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Black captured:</h4>
            <div className="flex flex-wrap gap-1">
              {capturedPieces.black.map((piece, index) => (
                <span key={index} className="text-2xl text-gray-900">
                  {pieceSymbols[`${piece.color}-${piece.type}`]}
                </span>
              ))}
              {capturedPieces.black.length === 0 && (
                <span className="text-slate-500 text-sm">None</span>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">White captured:</h4>
            <div className="flex flex-wrap gap-1">
              {capturedPieces.white.map((piece, index) => (
                <span key={index} className="text-2xl text-white drop-shadow-lg">
                  {pieceSymbols[`${piece.color}-${piece.type}`]}
                </span>
              ))}
              {capturedPieces.white.length === 0 && (
                <span className="text-slate-500 text-sm">None</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Move History */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Move History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            {moveHistory.length === 0 ? (
              <p className="text-slate-500 text-sm">No moves yet</p>
            ) : (
              <div className="space-y-1">
                {moveHistory.map((move, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400 w-8">{Math.floor(index / 2) + 1}.</span>
                    <span className="text-white">{move}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameInfo;
