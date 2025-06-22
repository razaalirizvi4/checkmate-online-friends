export interface ChessPiece {
  type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  color: 'white' | 'black';
  hasMoved?: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export type GameState = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

// Initialize the chess board with starting positions
export const initialBoard: (ChessPiece | null)[][] = [
  // Row 0 (8th rank) - Black pieces
  [
    { type: 'rook', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'queen', color: 'black' },
    { type: 'king', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'rook', color: 'black' },
  ],
  // Row 1 (7th rank) - Black pawns
  Array(8).fill({ type: 'pawn', color: 'black' }),
  // Rows 2-5 - Empty squares
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  // Row 6 (2nd rank) - White pawns
  Array(8).fill({ type: 'pawn', color: 'white' }),
  // Row 7 (1st rank) - White pieces
  [
    { type: 'rook', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'queen', color: 'white' },
    { type: 'king', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'rook', color: 'white' },
  ],
];

export const isValidPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
};

export const positionToNotation = (position: Position): string => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return `${files[position.col]}${8 - position.row}`;
};

export const copyBoard = (board: (ChessPiece | null)[][]): (ChessPiece | null)[][] => {
  return board.map(row => row.map(piece => piece ? { ...piece } : null));
};

export const getPieceImage = (piece: ChessPiece): string => {
  if (!piece) return '';
  // The piece images are SVGs located in the public assets directory.
  return `/assets/pieces/${piece.color}_${piece.type}.svg`;
};
