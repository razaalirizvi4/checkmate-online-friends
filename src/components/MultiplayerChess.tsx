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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  const [joiningGameId, setJoiningGameId] = useState('');
  const [availableGames, setAvailableGames] = useState<any[]>([]);

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
            // Handle board state parsing - it might be an object or JSON string
            let parsedBoardState: (ChessPiece | null)[][];
            
            if (typeof updatedSession.board_state === 'string') {
              parsedBoardState = JSON.parse(updatedSession.board_state) as (ChessPiece | null)[][];
            } else if (Array.isArray(updatedSession.board_state)) {
              parsedBoardState = updatedSession.board_state as unknown as (ChessPiece | null)[][];
            } else {
              console.error('Invalid board state format:', updatedSession.board_state);
              parsedBoardState = initialBoard;
            }
            
            setGameSession({
              ...updatedSession,
              board_state: parsedBoardState,
              current_turn: updatedSession.current_turn as 'white' | 'black',
              game_status: updatedSession.game_status as 'waiting' | 'active' | 'completed' | 'abandoned'
            });
            setBoard(parsedBoardState);
            setCurrentPlayer(updatedSession.current_turn as 'white' | 'black');
            setMoveHistory(updatedSession.move_history || []);
            
            if (updatedSession.game_status === 'active' && updatedSession.white_player_id && updatedSession.black_player_id) {
              setShowLobby(false);
              
              // Determine if current user is in this game
              const isWhitePlayer = updatedSession.white_player_id === user.id;
              const isBlackPlayer = updatedSession.black_player_id === user.id;
              
              if (isWhitePlayer || isBlackPlayer) {
                // Set player color if not already set
                if (!playerColor) {
                  setPlayerColor(isWhitePlayer ? 'white' : 'black');
                }
                
                // Show game started message
                if (isWhitePlayer) {
                  toast({
                    title: "Game Started!",
                    description: "Your opponent has joined. Good luck!",
                  });
                } else {
                  toast({
                    title: "Game Started!",
                    description: "You have joined the game. Good luck!",
                  });
                }
              }
            } else if (updatedSession.game_status === 'waiting' && (updatedSession.white_player_id === user.id || updatedSession.black_player_id === user.id)) {
              // Player has joined but game is still waiting for second player
              const isWhitePlayer = updatedSession.white_player_id === user.id;
              const isBlackPlayer = updatedSession.black_player_id === user.id;
              
              if (!playerColor) {
                setPlayerColor(isWhitePlayer ? 'white' : 'black');
              }
              
              toast({
                title: "Joined Game!",
                description: `You joined as ${isWhitePlayer ? 'White' : 'Black'}. Waiting for opponent...`,
              });
            }
          } catch (error) {
            console.error('Error parsing board state:', error);
            console.log('Raw board state:', updatedSession.board_state);
            console.log('Board state type:', typeof updatedSession.board_state);
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
        white_player_id: user.id, // Creator becomes white player
        black_player_id: null,
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
      // Handle board state parsing - it might be an object or JSON string
      let parsedBoardState: (ChessPiece | null)[][];
      
      if (typeof data.board_state === 'string') {
        parsedBoardState = JSON.parse(data.board_state) as (ChessPiece | null)[][];
      } else if (Array.isArray(data.board_state)) {
        parsedBoardState = data.board_state as unknown as (ChessPiece | null)[][];
      } else {
        console.error('Invalid board state format from database:', data.board_state);
        parsedBoardState = initialBoard;
      }
      
      setGameSession({
        ...data,
        board_state: parsedBoardState,
        current_turn: data.current_turn as 'white' | 'black',
        game_status: data.game_status as 'waiting' | 'active' | 'completed' | 'abandoned'
      });
      setBoard(parsedBoardState);
      setCurrentPlayer(data.current_turn as 'white' | 'black');
      setMoveHistory(data.move_history || []);
      setPlayerColor('white'); // Creator becomes white
      setShowLobby(false); // Show the chess board immediately
      
      toast({
        title: "Game Created",
        description: "Waiting for opponent to join..."
      });
      return { data, error: null };
    } catch (error) {
      console.error('Error parsing board state after game creation:', error);
      console.log('Raw board state from database:', data.board_state);
      console.log('Board state type:', typeof data.board_state);
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

  // Function to join an existing game
  const joinGame = async (gameId: string) => {
    if (!user || !gameId.trim()) return;

    console.log('Attempting to join game:', gameId);

    try {
      // First, check if the game exists (without status filter to see what's there)
      const { data: existingGame, error: fetchError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', gameId.trim())
        .single();

      console.log('Fetch result for join:', { existingGame, fetchError });

      if (fetchError) {
        console.error('Fetch error when joining:', fetchError);
        toast({
          title: "Game Not Found",
          description: `Error: ${fetchError.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!existingGame) {
        toast({
          title: "Game Not Found",
          description: "No game found with that ID.",
          variant: "destructive"
        });
        return;
      }

      console.log('Found game:', {
        id: existingGame.id,
        status: existingGame.game_status,
        white_player: existingGame.white_player_id,
        black_player: existingGame.black_player_id
      });

      // Check if user is already in the game
      if (existingGame.white_player_id === user.id) {
        toast({
          title: "Already in Game",
          description: "You are already the white player in this game.",
          variant: "destructive"
        });
        return;
      }

      if (existingGame.black_player_id === user.id) {
        toast({
          title: "Already in Game",
          description: "You are already the black player in this game.",
          variant: "destructive"
        });
        return;
      }

      // Check if game is already full
      if (existingGame.white_player_id && existingGame.black_player_id) {
        toast({
          title: "Game Full",
          description: "This game already has two players.",
          variant: "destructive"
        });
        return;
      }

      // Determine which color to assign
      let playerColor: 'white' | 'black';
      let updateData: any = {};

      console.log('Current game state:', {
        white_player_id: existingGame.white_player_id,
        black_player_id: existingGame.black_player_id
      });

      if (!existingGame.black_player_id) {
        // Black player slot is empty - joiner becomes black
        console.log('Black player slot empty - assigning black');
        playerColor = 'black';
        updateData = {
          black_player_id: user.id,
          game_status: 'active'
        };
      } else {
        toast({
          title: "Game Full",
          description: "This game already has two players.",
          variant: "destructive"
        });
        return;
      }

      console.log('Update data:', updateData);

      // Join the game
      const { data: updateResult, error: updateError } = await supabase
        .from('game_sessions')
        .update(updateData)
        .eq('id', gameId.trim())
        .select()
        .single();

      console.log('Update result:', { updateResult, updateError });

      if (updateError) {
        console.error('Update error when joining:', updateError);
        toast({
          title: "Error",
          description: `Failed to join the game: ${updateError.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Successfully updated game:', updateResult);

      // Set up the game session for the joining player
      try {
        // Handle board state parsing - it might be an object or JSON string
        let parsedBoardState: (ChessPiece | null)[][];
        
        if (typeof updateResult.board_state === 'string') {
          parsedBoardState = JSON.parse(updateResult.board_state) as (ChessPiece | null)[][];
        } else if (Array.isArray(updateResult.board_state)) {
          parsedBoardState = updateResult.board_state as unknown as (ChessPiece | null)[][];
        } else {
          console.error('Invalid board state format from database:', updateResult.board_state);
          parsedBoardState = initialBoard;
        }
        
        setGameSession({
          ...updateResult,
          board_state: parsedBoardState,
          current_turn: updateResult.current_turn as 'white' | 'black',
          game_status: updateResult.game_status as 'waiting' | 'active' | 'completed' | 'abandoned'
        });
        setBoard(parsedBoardState);
        setCurrentPlayer(updateResult.current_turn as 'white' | 'black');
        setMoveHistory(updateResult.move_history || []);
        setPlayerColor(playerColor);
        setShowLobby(false);
        
        toast({
          title: "Success!",
          description: `You have joined the game as Black!`,
        });
      } catch (error) {
        console.error('Error parsing board state when joining:', error);
        console.log('Raw board state from database:', updateResult.board_state);
        console.log('Board state type:', typeof updateResult.board_state);
        toast({
          title: "Error",
          description: "Failed to initialize game board",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Unexpected error when joining game:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to fetch available games
  const fetchAvailableGames = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('game_status', 'waiting')
        .or('white_player_id.is.null,black_player_id.is.null')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching available games:', error);
        return;
      }

      console.log('Available games:', data);
      setAvailableGames(data || []);
    } catch (error) {
      console.error('Unexpected error fetching games:', error);
    }
  };

  // Fetch available games when component mounts
  useEffect(() => {
    fetchAvailableGames();
  }, []);

  // Test function to check database state
  const testDatabaseState = async () => {
    try {
      console.log('Testing database state...');
      
      // Check all games
      const { data: allGames, error: allGamesError } = await supabase
        .from('game_sessions')
        .select('*');
      
      console.log('All games:', allGames);
      console.log('All games error:', allGamesError);
      
      // Check waiting games
      const { data: waitingGames, error: waitingError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('game_status', 'waiting');
      
      console.log('Waiting games:', waitingGames);
      console.log('Waiting games error:', waitingError);
      
    } catch (error) {
      console.error('Test error:', error);
    }
  };

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
            <Button
              onClick={testDatabaseState}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Test Database State
            </Button>
            {gameSession && (
              <div className="text-center text-slate-300">
                <p>Game created! Share this with a friend or invite them below.</p>
                <p className="text-sm text-slate-400 mt-2">Game ID: {gameSession.id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Join Existing Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinGameId" className="text-slate-300">Game ID</Label>
              <Input
                id="joinGameId"
                type="text"
                placeholder="Enter game ID..."
                value={joiningGameId}
                onChange={(e) => setJoiningGameId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    joinGame(joiningGameId);
                  }
                }}
              />
            </div>
            <Button
              onClick={() => joinGame(joiningGameId)}
              disabled={!joiningGameId.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
            >
              Join Game
            </Button>
          </CardContent>
        </Card>

        {/* Available Games List */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              Available Games
              <Button
                onClick={fetchAvailableGames}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableGames.length === 0 ? (
              <p className="text-slate-400 text-center">No games available to join</p>
            ) : (
              <div className="space-y-2">
                {availableGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-2 bg-slate-700 rounded"
                  >
                    <div className="text-slate-300 text-sm">
                      <p>Game ID: {game.id}</p>
                      <p className="text-xs text-slate-400">
                        Created: {new Date(game.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setJoiningGameId(game.id);
                        joinGame(game.id);
                      }}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Join
                    </Button>
                  </div>
                ))}
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
