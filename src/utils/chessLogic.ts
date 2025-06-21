
import { ChessPiece, Position, GameState, isValidPosition, copyBoard, positionToNotation } from './chessUtils';

export interface MoveResult {
  newBoard: (ChessPiece | null)[][];
  capturedPiece?: ChessPiece;
  moveNotation: string;
  gameState?: GameState;
}

export const isValidMove = (
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  piece: ChessPiece
): boolean => {
  if (!isValidPosition(to.row, to.col)) return false;
  
  const targetPiece = board[to.row][to.col];
  if (targetPiece && targetPiece.color === piece.color) return false;

  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;
  const absRowDiff = Math.abs(rowDiff);
  const absColDiff = Math.abs(colDiff);

  switch (piece.type) {
    case 'pawn':
      return isValidPawnMove(board, from, to, piece, rowDiff, colDiff);
    case 'rook':
      return isValidRookMove(board, from, to, rowDiff, colDiff);
    case 'knight':
      return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
    case 'bishop':
      return isValidBishopMove(board, from, to, rowDiff, colDiff);
    case 'queen':
      return isValidRookMove(board, from, to, rowDiff, colDiff) || 
             isValidBishopMove(board, from, to, rowDiff, colDiff);
    case 'king':
      return absRowDiff <= 1 && absColDiff <= 1;
    default:
      return false;
  }
};

const isValidPawnMove = (
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  piece: ChessPiece,
  rowDiff: number,
  colDiff: number
): boolean => {
  const direction = piece.color === 'white' ? -1 : 1;
  const startRow = piece.color === 'white' ? 6 : 1;
  const targetPiece = board[to.row][to.col];

  // Forward move
  if (colDiff === 0) {
    if (targetPiece) return false;
    if (rowDiff === direction) return true;
    if (from.row === startRow && rowDiff === 2 * direction) return true;
  }
  
  // Diagonal capture
  if (Math.abs(colDiff) === 1 && rowDiff === direction) {
    return targetPiece !== null && targetPiece.color !== piece.color;
  }

  return false;
};

const isValidRookMove = (
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  rowDiff: number,
  colDiff: number
): boolean => {
  if (rowDiff !== 0 && colDiff !== 0) return false;
  return isPathClear(board, from, to);
};

const isValidBishopMove = (
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  rowDiff: number,
  colDiff: number
): boolean => {
  if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
  return isPathClear(board, from, to);
};

const isPathClear = (
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position
): boolean => {
  const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
  const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;

  let currentRow = from.row + rowStep;
  let currentCol = from.col + colStep;

  while (currentRow !== to.row || currentCol !== to.col) {
    if (board[currentRow][currentCol] !== null) return false;
    currentRow += rowStep;
    currentCol += colStep;
  }

  return true;
};

export const makeMove = (
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position
): MoveResult => {
  const newBoard = copyBoard(board);
  const piece = newBoard[from.row][from.col]!;
  const capturedPiece = newBoard[to.row][to.col];

  // Make the move
  newBoard[to.row][to.col] = { ...piece, hasMoved: true };
  newBoard[from.row][from.col] = null;

  // Generate move notation
  const moveNotation = generateMoveNotation(piece, from, to, capturedPiece !== null);

  return {
    newBoard,
    capturedPiece: capturedPiece || undefined,
    moveNotation,
  };
};

const generateMoveNotation = (
  piece: ChessPiece,
  from: Position,
  to: Position,
  isCapture: boolean
): string => {
  const pieceSymbol = piece.type === 'pawn' ? '' : piece.type.charAt(0).toUpperCase();
  const fromNotation = positionToNotation(from);
  const toNotation = positionToNotation(to);
  
  if (piece.type === 'pawn') {
    if (isCapture) {
      return `${fromNotation.charAt(0)}x${toNotation}`;
    }
    return toNotation;
  }
  
  return `${pieceSymbol}${isCapture ? 'x' : ''}${toNotation}`;
};
