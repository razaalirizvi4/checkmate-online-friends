import React from 'react';
import { ChessPiece, Position, getPieceImage } from '../utils/chessUtils';
import { cn } from '../lib/utils';

interface ChessBoardProps {
  board: (ChessPiece | null)[][];
  selectedSquare: Position | null;
  onSquareClick: (position: Position) => void;
  currentPlayer: 'white' | 'black';
}

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
      <div className="p-4 bg-[hsl(var(--bonk-card-bg))] border-2 border-[hsl(var(--bonk-border))] rounded-lg shadow-2xl">
        {/* Column labels (top) */}
        <div className="flex mb-2">
          <div className="w-8"></div>
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(letter => (
            <div key={letter} className="w-16 h-6 flex items-center justify-center text-[hsl(var(--bonk-text-dark))] font-semibold">
              {letter}
            </div>
          ))}
          <div className="w-8"></div>
        </div>

        <div className="flex">
          {/* Row labels (left) */}
          <div className="flex flex-col">
            {[8, 7, 6, 5, 4, 3, 2, 1].map(number => (
              <div key={number} className="w-8 h-16 flex items-center justify-center text-[hsl(var(--bonk-text-dark))] font-semibold">
                {number}
              </div>
            ))}
          </div>

          {/* Chess board */}
          <div className="grid grid-cols-8 gap-0 border-2 border-[hsl(var(--bonk-border))] rounded-md overflow-hidden">
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
                      isLight ? "bg-[hsl(var(--bonk-border))]" : "bg-[hsl(var(--bonk-card-bg))]",
                      isSelected && "ring-4 ring-[hsl(var(--bonk-orange))] ring-inset",
                      "hover:brightness-125"
                    )}
                    onClick={() => onSquareClick(position)}
                  >
                    {piece && (
                      <img
                        src={getPieceImage(piece)}
                        alt={`${piece.color} ${piece.type}`}
                        className="w-12 h-12 object-contain"
                      />
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
              <div key={number} className="w-8 h-16 flex items-center justify-center text-[hsl(var(--bonk-text-dark))] font-semibold">
                {number}
              </div>
            ))}
          </div>
        </div>

        {/* Column labels (bottom) */}
        <div className="flex mt-2">
          <div className="w-8"></div>
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(letter => (
            <div key={letter} className="w-16 h-6 flex items-center justify-center text-[hsl(var(--bonk-text-dark))] font-semibold">
              {letter}
            </div>
          ))}
          <div className="w-8"></div>
        </div>
      </div>

      {/* Current player indicator */}
      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
        <div className={cn(
          "px-4 py-2 rounded-full font-bold text-black",
          "bg-[hsl(var(--bonk-orange))]"
        )}>
          {currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;
