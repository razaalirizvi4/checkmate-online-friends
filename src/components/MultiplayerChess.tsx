import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ChessBoard from './ChessBoard';
import GameInfo from './GameInfo';
import FriendsList from './FriendsList';
import { initialBoard, ChessPiece, Position, GameState } from '../utils/chessUtils';
import { isValidMove, makeMove } from '../utils/chessLogic';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GameSession {
  id: string;
  white_player_id: string;
  black_player_id: string | null;
  board_state: (ChessPiece | null)[][];
  current_turn: 'white' | 'black';
  game_status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner: string | null;
  move_history: string[];
  created_at?: string;
  updated_at?: string;
}

const MultiplayerChess = () => {
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [board, setBoard] = useState<(ChessPiece | null)[][]>(initialBoard);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [gameState, setGameState] = useState<GameState>('playing');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<{
    white: ChessPiece[];
    black: ChessPiece[];
  }>({ white: [], black: [] });
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
  const [showLobby, setShowLobby] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!gameSession) return;

    const channel = supabase
      .channel('game_session_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${gameSession.id}`
        },
        (payload) => {
          const updatedSession = payload.new as any;
          
          try {
            const parsedBoardState = JSON.parse(updatedSession.board_state as string) as (ChessPiece | null)[][];
            
            setGameSession({
              ...updatedSession,
              board_state: parsedBoardState,
              current_turn: updatedSession.current_turn as 'white' | 'black',
              game_status: updatedSession.game_status as 'waiting' | 'active' | 'completed' | 'abandoned'
            });
            setBoard(parsedBoardState);
            setCurrentPlayer(updatedSession.current_turn as 'white' | 'black');
            setMoveHistory(updatedSession.move_history || []);
            
            if (updatedSession.game_status === 'active' && updatedSession.black_player_id) {
              setShowLobby(false);
              toast({
                title: "Game Started!",
                description: "Your opponent has joined. Good luck!"
              });
            }
          } catch (error) {
            console.error('Error parsing board state:', error);
            console.log('Raw board state:', updatedSession.board_state);
            // Fallback to initial board if parsing fails
            setBoard(initialBoard);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameSession]);

  const createGame = async () => {
    if (!user) return;

    console.log('Creating new game for user:', user.id);

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        white_player_id: user.id,
        board_state: JSON.stringify(initialBoard),
        current_turn: 'white',
        game_status: 'waiting'
      })
      .select()
      .single();

    console.log('Game creation result:', { data, error });

    if (error) {
      console.error('Game creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create game",
        variant: "destructive"
      });
      return { data: null, error };
    }

    console.log('Game created successfully with ID:', data.id);

    try {
      const parsedBoardState = JSON.parse(data.board_state as string) as (ChessPiece | null)[][];
      
      setGameSession({
        ...data,
        board_state: parsedBoardState,
        current_turn: data.current_turn as 'white' | 'black',
        game_status: data.game_status as 'waiting' | 'active' | 'completed' | 'abandoned'
      });
      setPlayerColor('white');
      setShowLobby(true);
      toast({
        title: "Game Created",
        description: "Waiting for a friend to join..."
      });
      return { data, error: null };
    } catch (error) {
      console.error('Error parsing board state after game creation:', error);
      console.log('Raw board state from database:', data.board_state);
      toast({
        title: "Error",
        description: "Failed to initialize game board",
        variant: "destructive"
      });
      return { data: null, error: new Error('Board state parsing failed') };
    }
  };

  const inviteFriend = async (friendId: string) => {
    let session = gameSession;
    if (!session) {
      const newGame = await createGame();
      if (newGame.error || !newGame.data) return;
      session = newGame.data;
    }

    const { error } = await supabase
      .from('game_sessions')
      .update({
        black_player_id: friendId,
        game_status: 'active'
      })
      .eq('id', session.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to invite friend",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Friend Invited",
      description: "Your friend has been invited to the game!"
    });
  };

  const handleSquareClick = useCallback((position: Position) => {
    if (!gameSession || gameState !== 'playing' || currentPlayer !== playerColor) return;

    if (selectedSquare) {
      const piece = board[selectedSquare.row][selectedSquare.col];
      
      if (piece && piece.color === currentPlayer) {
        if (isValidMove(board, selectedSquare, position, piece)) {
          const result = makeMove(board, selectedSquare, position);
          
          // Update local state immediately for responsiveness
          if (result.capturedPiece) {
            setCapturedPieces(prev => ({
              ...prev,
              [result.capturedPiece!.color]: [...prev[result.capturedPiece!.color], result.capturedPiece!]
            }));
          }
          
          const newTurn = currentPlayer === 'white' ? 'black' : 'white';
          
          // Update the game session in Supabase
          supabase
            .from('game_sessions')
            .update({
              board_state: JSON.stringify(result.newBoard),
              current_turn: newTurn,
              move_history: [...moveHistory, result.moveNotation]
            })
            .eq('id', gameSession.id)
            .then(({ error }) => {
              if (error) {
                toast({
                  title: "Error",
                  description: "Failed to make move",
                  variant: "destructive"
                });
              }
            });
        }
      }
      setSelectedSquare(null);
    } else {
      const piece = board[position.row][position.col];
      if (piece && piece.color === currentPlayer && piece.color === playerColor) {
        setSelectedSquare(position);
      }
    }
  }, [board, selectedSquare, currentPlayer, gameState, gameSession, playerColor, moveHistory]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-white">Please sign in to play multiplayer chess</p>
      </div>
    );
  }

  if (showLobby || !gameSession) {
    return (
      <div className="space-y-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Multiplayer Lobby</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={createGame}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Create New Game
            </Button>
            {gameSession && (
              <div className="text-center text-slate-300">
                <p>Game created! Share this with a friend or invite them below.</p>
                <p className="text-sm text-slate-400 mt-2">Game ID: {gameSession.id}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <FriendsList onInviteFriend={inviteFriend} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
      <div className="flex-shrink-0">
        <ChessBoard
          board={board}
          selectedSquare={selectedSquare}
          onSquareClick={handleSquareClick}
          currentPlayer={currentPlayer}
        />
        {playerColor && (
          <div className="text-center mt-4">
            <p className="text-white">
              You are playing as {playerColor === 'white' ? 'White' : 'Black'}
            </p>
          </div>
        )}
      </div>
      <div className="w-full lg:w-80">
        <GameInfo
          currentPlayer={currentPlayer}
          gameState={gameState}
          moveHistory={moveHistory}
          capturedPieces={capturedPieces}
          onReset={() => setShowLobby(true)}
        />
      </div>
    </div>
  );
};

export default MultiplayerChess;
