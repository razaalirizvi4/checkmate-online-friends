import React from 'react';
import { ChessPiece, Position, getPieceImage } from '../utils/chessUtils';
import { cn } from '../lib/utils';

interface ChessBoardProps {
  board: (ChessPiece | null)[][];
  selectedSquare: Position | null;
  onSquareClick: (position: Position) => void;
  currentPlayer: 'white' | 'black';
  validMoves: Position[];
}

const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  selectedSquare,
  onSquareClick,
  currentPlayer,
  validMoves
}) => {
  const isLightSquare = (row: number, col: number) => (row + col) % 2 === 0;

  const isValidMove = (position: Position) => {
    return validMoves.some(move => move.row === position.row && move.col === position.col);
  };

  const isCaptureMove = (position: Position) => {
    return isValidMove(position) && board[position.row][position.col] !== null;
  };

  return (
    <div className="relative">
      {/* Board border with coordinates */}
      <div className="p-4 bg-[hsl(var(--bonk-card-bg))] border-2 border-[hsl(var(--bonk-border))] rounded-lg shadow-2xl">
        {/* Column labels (top) */}
        <div className="flex mb-2">
          <div className="w-10"></div>
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(letter => (
            <div key={letter} className="w-20 h-6 flex items-center justify-center text-black font-semibold">
              {letter}
            </div>
          ))}
          <div className="w-10"></div>
        </div>

        <div className="flex">
          {/* Row labels (left) */}
          <div className="flex flex-col">
            {[8, 7, 6, 5, 4, 3, 2, 1].map(number => (
              <div key={number} className="w-10 h-20 flex items-center justify-center text-black font-semibold">
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
                const isValidMoveSquare = isValidMove(position);
                const isCaptureSquare = isCaptureMove(position);
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cn(
                      "w-20 h-20 flex items-center justify-center cursor-pointer transition-all duration-200 relative",
                      isLight ? "bg-[#FF9F3A]" : "bg-[#FF7F2A]",
                      isSelected && "ring-4 ring-[hsl(var(--bonk-orange))] ring-inset",
                      "hover:brightness-125"
                    )}
                    onClick={() => onSquareClick(position)}
                  >
                    {piece && (
                      <img
                        src={getPieceImage(piece)}
                        alt={`${piece.color} ${piece.type}`}
                        className="w-16 h-16 object-contain"
                      />
                    )}
                    
                    {/* Show capture indicator (red ring around piece) */}
                    {isCaptureSquare && piece && (
                      <div className="absolute inset-0 ring-4 ring-red-500 ring-inset rounded-sm"></div>
                    )}
                    
                    {/* Show valid move indicator (green dot) */}
                    {isValidMoveSquare && !piece && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 bg-green-500 rounded-full opacity-60"></div>
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
              <div key={number} className="w-10 h-20 flex items-center justify-center text-black font-semibold">
                {number}
              </div>
            ))}
          </div>
        </div>

        {/* Column labels (bottom) */}
        <div className="flex mt-2">
          <div className="w-10"></div>
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(letter => (
            <div key={letter} className="w-20 h-6 flex items-center justify-center text-black font-semibold">
              {letter}
            </div>
          ))}
          <div className="w-10"></div>
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
