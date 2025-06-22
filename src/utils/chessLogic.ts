import { ChessPiece, Position, GameState, isValidPosition, copyBoard, positionToNotation } from './chessUtils';

export interface MoveResult {
  newBoard: (ChessPiece | null)[][];
  capturedPiece?: ChessPiece;
  moveNotation: string;
  gameState?: GameState;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
}

// Find the king of the specified color
const findKing = (board: (ChessPiece | null)[][], color: 'white' | 'black'): Position | null => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
};

// Check if a king is in check
export const isKingInCheck = (board: (ChessPiece | null)[][], color: 'white' | 'black'): boolean => {
  const kingPosition = findKing(board, color);
  if (!kingPosition) return false;

  // Check if any opponent piece can attack the king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color !== color) {
        if (isValidMove(board, { row, col }, kingPosition, piece)) {
          return true;
        }
      }
    }
  }
  return false;
};

// Check if a move would put or leave the king in check
const wouldMoveCauseCheck = (
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  piece: ChessPiece
): boolean => {
  const newBoard = copyBoard(board);
  newBoard[to.row][to.col] = { ...piece, hasMoved: true };
  newBoard[from.row][from.col] = null;
  
  return isKingInCheck(newBoard, piece.color);
};

// Get all valid moves for a player (considering check)
export const getValidMovesForPlayer = (
  board: (ChessPiece | null)[][],
  color: 'white' | 'black'
): Array<{ from: Position; to: Position; piece: ChessPiece }> => {
  const validMoves: Array<{ from: Position; to: Position; piece: ChessPiece }> = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            const toPosition = { row: toRow, col: toCol };
            if (isValidMove(board, { row, col }, toPosition, piece) &&
                !wouldMoveCauseCheck(board, { row, col }, toPosition, piece)) {
              validMoves.push({
                from: { row, col },
                to: toPosition,
                piece
              });
            }
          }
        }
      }
    }
  }

  return validMoves;
};

// Check if the current player is in checkmate
export const isCheckmate = (board: (ChessPiece | null)[][], color: 'white' | 'black'): boolean => {
  if (!isKingInCheck(board, color)) return false;
  
  const validMoves = getValidMovesForPlayer(board, color);
  return validMoves.length === 0;
};

// Check if the current player is in stalemate
export const isStalemate = (board: (ChessPiece | null)[][], color: 'white' | 'black'): boolean => {
  if (isKingInCheck(board, color)) return false;
  
  const validMoves = getValidMovesForPlayer(board, color);
  return validMoves.length === 0;
};

// Check for insufficient material (draw)
export const hasInsufficientMaterial = (board: (ChessPiece | null)[][]): boolean => {
  let whitePieces: ChessPiece[] = [];
  let blackPieces: ChessPiece[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        if (piece.color === 'white') {
          whitePieces.push(piece);
        } else {
          blackPieces.push(piece);
        }
      }
    }
  }

  // King vs King
  if (whitePieces.length === 1 && blackPieces.length === 1) {
    return true;
  }

  // King and Bishop vs King or King and Knight vs King
  if (whitePieces.length === 2 && blackPieces.length === 1) {
    const whiteMinorPiece = whitePieces.find(p => p.type === 'bishop' || p.type === 'knight');
    if (whiteMinorPiece) return true;
  }

  if (blackPieces.length === 2 && whitePieces.length === 1) {
    const blackMinorPiece = blackPieces.find(p => p.type === 'bishop' || p.type === 'knight');
    if (blackMinorPiece) return true;
  }

  return false;
};

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

  // Determine the next player's color
  const nextPlayerColor = piece.color === 'white' ? 'black' : 'white';

  // Check for check, checkmate, and stalemate
  const isCheck = isKingInCheck(newBoard, nextPlayerColor);
  const isCheckmateResult = isCheckmate(newBoard, nextPlayerColor);
  const isStalemateResult = !isCheck && isStalemate(newBoard, nextPlayerColor);
  const insufficientMaterial = hasInsufficientMaterial(newBoard);

  // Determine game state
  let gameState: GameState = 'playing';
  if (isCheckmateResult) {
    gameState = 'checkmate';
  } else if (isStalemateResult || insufficientMaterial) {
    gameState = 'draw';
  } else if (isCheck) {
    gameState = 'check';
  }

  return {
    newBoard,
    capturedPiece: capturedPiece || undefined,
    moveNotation,
    gameState,
    isCheck,
    isCheckmate: isCheckmateResult,
    isStalemate: isStalemateResult
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
