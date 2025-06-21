
import React from 'react';
import { ChessPiece, Position } from '../utils/chessUtils';
import { cn } from '../lib/utils';

interface ChessBoardProps {
  board: (ChessPiece | null)[][];
  selectedSquare: Position | null;
  onSquareClick: (position: Position) => void;
  currentPlayer: 'white' | 'black';
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

const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  selectedSquare,
  onSquareClick,
  currentPlayer
}) => {
  const isLightSquare = (row: number, col: number) => (row + col) % 2 === 0;

  return (
    <div className="relative">
      {/* Board border with coordinates */}
      <div className="p-4 bg-gradient-to-br from-amber-900 to-amber-800 rounded-lg shadow-2xl">
        {/* Column labels (top) */}
        <div className="flex mb-2">
          <div className="w-8"></div>
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(letter => (
            <div key={letter} className="w-16 h-6 flex items-center justify-center text-amber-200 font-semibold">
              {letter}
            </div>
          ))}
          <div className="w-8"></div>
        </div>

        <div className="flex">
          {/* Row labels (left) */}
          <div className="flex flex-col">
            {[8, 7, 6, 5, 4, 3, 2, 1].map(number => (
              <div key={number} className="w-8 h-16 flex items-center justify-center text-amber-200 font-semibold">
                {number}
              </div>
            ))}
          </div>

          {/* Chess board */}
          <div className="grid grid-cols-8 gap-0 border-2 border-amber-700 rounded-md overflow-hidden">
            {board.map((row, rowIndex) =>
              row.map((piece, colIndex) => {
                const position = { row: rowIndex, col: colIndex };
                const isSelected = selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex;
                const isLight = isLightSquare(rowIndex, colIndex);
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cn(
                      "w-16 h-16 flex items-center justify-center cursor-pointer transition-all duration-200 relative",
                      isLight ? "bg-amber-100" : "bg-amber-800",
                      isSelected && "ring-4 ring-blue-400 ring-inset",
                      "hover:brightness-110 hover:scale-105"
                    )}
                    onClick={() => onSquareClick(position)}
                  >
                    {piece && (
                      <span 
                        className={cn(
                          "text-5xl transition-transform duration-200 select-none",
                          piece.color === 'white' ? "text-white drop-shadow-lg" : "text-gray-900",
                          "hover:scale-110"
                        )}
                        style={{
                          filter: piece.color === 'white' 
                            ? 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))' 
                            : 'drop-shadow(1px 1px 2px rgba(255,255,255,0.3))'
                        }}
                      >
                        {pieceSymbols[`${piece.color}-${piece.type}`]}
                      </span>
                    )}
                    
                    {/* Highlight possible moves */}
                    {!piece && selectedSquare && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 bg-green-500 rounded-full opacity-60"></div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Row labels (right) */}
          <div className="flex flex-col">
            {[8, 7, 6, 5, 4, 3, 2, 1].map(number => (
              <div key={number} className="w-8 h-16 flex items-center justify-center text-amber-200 font-semibold">
                {number}
              </div>
            ))}
          </div>
        </div>

        {/* Column labels (bottom) */}
        <div className="flex mt-2">
          <div className="w-8"></div>
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(letter => (
            <div key={letter} className="w-16 h-6 flex items-center justify-center text-amber-200 font-semibold">
              {letter}
            </div>
          ))}
          <div className="w-8"></div>
        </div>
      </div>

      {/* Current player indicator */}
      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
        <div className={cn(
          "px-4 py-2 rounded-full font-semibold text-white",
          currentPlayer === 'white' ? "bg-white text-gray-900" : "bg-gray-900 text-white"
        )}>
          {currentPlayer === 'white' ? "White's Turn" : "Black's Turn"}
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;
