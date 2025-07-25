import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ChessBoard from './ChessBoard';
import GameInfo from './GameInfo';
import FriendsList from './FriendsList';
import { initialBoard, ChessPiece, Position, GameState } from '../utils/chessUtils';
import { isValidMove, makeMove, getValidMovesForPlayer, isKingInCheck } from '../utils/chessLogic';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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
  //const [showWaiting, setShowWaiting] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState('');
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [isMakingMove, setIsMakingMove] = useState(false);
  const [invitedGames, setInvitedGames] = useState<any[]>([]);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Add debugging for board state changes
  useEffect(() => {
    console.log('Board state changed:', board);
  }, [board]);

  // Add debugging for current player changes
  useEffect(() => {
    console.log('Current player changed:', currentPlayer);
  }, [currentPlayer]);

  // Reload board state

  


  // Replace the existing real-time subscription useEffect with this fixed version

useEffect(() => {
  if (!gameSession) {
    console.log('🔍 Real-time subscription NOT set up - no gameSession');
    return;
  }

  console.log('🔍 Setting up real-time subscription for game:', gameSession.id);
  console.log('🔍 Current gameSession state:', {
    id: gameSession.id,
    game_status: gameSession.game_status,
    white_player: gameSession.white_player_id,
    black_player: gameSession.black_player_id
  });

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
        console.log('🚨 REAL-TIME UPDATE TRIGGERED!');
        console.log('🚨 Full payload:', payload);
        
        const updatedSession = payload.new as any;
        
        console.log('🚨 Real-time update received:', {
          game_status: updatedSession.game_status,
          current_turn: updatedSession.current_turn,
          white_player: updatedSession.white_player_id,
          black_player: updatedSession.black_player_id,
          board_state_type: typeof updatedSession.board_state
        });
        
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
          
          console.log('Parsed board state:', parsedBoardState);
          console.log('Current board state before update:', board);
          
            // Check if this update is actually newer (has more moves)
            const currentMoveCount = moveHistory.length;
            const newMoveCount = updatedSession.move_history?.length || 0;
            
            if (newMoveCount >= currentMoveCount) {
              // Always update the game session and board state from real-time updates
              setGameSession(prevSession => ({
                ...prevSession,
                ...updatedSession,
                board_state: parsedBoardState,
                current_turn: updatedSession.current_turn as 'white' | 'black',
                game_status: updatedSession.game_status as 'waiting' | 'active' | 'completed' | 'abandoned'
              }));
           
                            // Always update the board state
                            setBoard(parsedBoardState);
                            setCurrentPlayer(updatedSession.current_turn as 'white' | 'black');
                            setMoveHistory(updatedSession.move_history || []);

          } else {
            console.log('Ignoring older board state update');
          }
          
          // Reset loading state since we received an update
          setIsMakingMove(false);

          // Reload board state to ensure consistency
          reloadBoardState();
          
          // Show appropriate notifications based on game status
            const isWhitePlayer = updatedSession.white_player_id === user?.id;
            if (updatedSession.game_status === 'active' && updatedSession.white_player_id && updatedSession.black_player_id) {
              setShowLobby(false);
              
              // Show turn change notification
              const newTurn = updatedSession.current_turn as 'white' | 'black';
             
              if (newTurn === (isWhitePlayer ? 'white' : 'black')) {
                toast({
                  title: "Your Turn!",
                  description: "It's your turn to move.",
                });
              } else {
                toast({
                  title: "Opponent's Turn",
                  description: "Waiting for opponent to move...",
                });
              }
            } else if (updatedSession.game_status === 'waiting') {
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

  console.log('🔍 Real-time subscription set up successfully for game:', gameSession.id);

  return () => {
    console.log('🔍 Cleaning up real-time subscription for game:', gameSession.id);
    supabase.removeChannel(channel);
  };
}, [gameSession?.id, user?.id, playerColor]); // Fixed: Removed moveHistory.length to prevent subscription restart

// Add a polling fallback for when real-time fails
useEffect(() => {
  if (!gameSession || gameSession.game_status !== 'waiting') return;

  console.log('🔄 Starting polling fallback for waiting game:', gameSession.id);
  
  const pollInterval = setInterval(async () => {
    console.log('🔄 Polling game state...');
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', gameSession.id)
        .single();
        
      if (error) {
        console.error('🔄 Polling error:', error);
        return;
      }
      
      console.log('🔄 Polled game data:', {
        game_status: data.game_status,
        black_player_id: data.black_player_id,
        current_gameSession_status: gameSession.game_status
      });
      
      // If the game status changed or black player joined
      if (data.game_status !== gameSession.game_status || 
          data.black_player_id !== gameSession.black_player_id) {
        
        console.log('🔄 POLLING DETECTED CHANGE! Updating gameSession');
        
        // Parse board state
        let parsedBoardState: (ChessPiece | null)[][];
        if (typeof data.board_state === 'string') {
          parsedBoardState = JSON.parse(data.board_state);
        } else if (Array.isArray(data.board_state)) {
          parsedBoardState = data.board_state as unknown as (ChessPiece | null)[][];
        } else {
          parsedBoardState = initialBoard;
        }
        
        // Update the game session
        setGameSession({
          ...data,
          board_state: parsedBoardState,
          current_turn: data.current_turn as 'white' | 'black',
          game_status: data.game_status as 'waiting' | 'active' | 'completed' | 'abandoned'
        });
        
        setBoard(parsedBoardState);
        setCurrentPlayer(data.current_turn as 'white' | 'black');
        setMoveHistory(data.move_history || []);
        
        // Show notification
        if (data.game_status === 'active' && data.black_player_id) {
          toast({
            title: "Game Started!",
            description: "Your opponent has joined. Let's play!",
          });
        }
      }
    } catch (error) {
      console.error('🔄 Polling error:', error);
    }
  }, 2000); // Poll every 2 seconds
  
  return () => {
    console.log('🔄 Stopping polling fallback');
    clearInterval(pollInterval);
  };
}, [gameSession?.id, gameSession?.game_status, gameSession?.black_player_id, toast]);

  const createGame = async () => {
    if (!user) return;

    console.log('Creating new game for user:', user.id);
    // Initialize the game session with the initial board state
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
      
      console.log('🎮 Game created - setting gameSession:', {
        id: data.id,
        game_status: data.game_status,
        white_player: data.white_player_id,
        black_player: data.black_player_id
      });
      
      setBoard(parsedBoardState);
      setCurrentPlayer(data.current_turn as 'white' | 'black');
      setMoveHistory(data.move_history || []);
      setPlayerColor('white'); // Creator becomes white
      // Show waiting screen for game creator
      setShowLobby(false);
      //setShowWaiting(true);
      
      
      // Show a toast with the game ID and a copy button
      toast({
        title: 'Game Created!',
        description: `Game ID: ${data.id}`,
        action: (
          <button
            style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#FFA500', color: '#222', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              navigator.clipboard.writeText(data.id);
              toast({ title: 'Copied!', description: 'Game ID copied to clipboard.' });
            }}
          >Copy</button>
        ),
        duration: 10000
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

  const getValidMovesForPlayerMemo = useCallback(() => {
    if (!playerColor) return [];
    return getValidMovesForPlayer(board, playerColor);
  }, [board, playerColor]);

  const handleSquareClick = useCallback((position: Position) => {
    reloadBoardState();
    console.log('🎯 Square clicked:', position);
    console.log('🎯 Game state:', { 
      gameSession: gameSession?.id, 
      gameStatus: gameSession?.game_status, 
      gameState, 
      currentPlayer, 
      playerColor, 
      isMakingMove,
      user: user?.id 
    });
    
    if (!gameSession || gameSession.game_status !== 'active') {
      console.log('❌ Game not active - gameSession:', !!gameSession, 'status:', gameSession?.game_status);
      return;
    }

    if (currentPlayer !== playerColor) {
      console.log('❌ Not your turn - currentPlayer:', currentPlayer, 'playerColor:', playerColor);
      return;
    }

    if (isMakingMove) {
      console.log('❌ Already making a move, please wait');
      return;
    }

    if (selectedSquare) {
      const piece = board[selectedSquare.row][selectedSquare.col];
      
      if (piece && piece.color === currentPlayer) {
        // Use the simpler isValidMove check from the old working code
        if (isValidMove(board, selectedSquare, position, piece)) {
          console.log('✅ Valid move, making move...');
          setIsMakingMove(true);
          const result = makeMove(board, selectedSquare, position);
          
          const newTurn = currentPlayer === 'white' ? 'black' : 'white';
          const newMoveHistory = [...moveHistory, result.moveNotation];
          
          // // OPTIMISTIC UPDATE: Update local state immediately for instant UI feedback
          // setBoard(result.newBoard);
          // setCurrentPlayer(newTurn);
          // setMoveHistory(newMoveHistory);
          // setSelectedSquare(null);
          
          reloadBoardState();

          console.log('Updating database with move:', {
            board_state: result.newBoard,
            current_turn: newTurn,
            move_history: newMoveHistory,
            game_state: result.gameState
          });
          
          // Show game state notifications
          if (result.isCheckmate) {
            toast({
              title: "Checkmate!",
              description: `${currentPlayer === 'white' ? 'White' : 'Black'} wins!`,
              variant: "default"
            });
          } else if (result.isStalemate) {
            toast({
              title: "Stalemate!",
              description: "The game is a draw.",
              variant: "default"
            });
          } else if (result.isCheck) {
            toast({
              title: "Check!",
              description: `${newTurn === 'white' ? 'White' : 'Black'} is in check!`,
              variant: "default"
            });
          }
          
          // Update the game session in Supabase
          supabase
            .from('game_sessions')
            .update({
              board_state: JSON.stringify(result.newBoard),
              current_turn: newTurn,
              move_history: newMoveHistory,
              game_status: result.gameState === 'checkmate' ? 'completed' : 'active',
              winner: result.gameState === 'checkmate' ? user?.id : null,
              updated_at: new Date().toISOString() // Force update timestamp
            })
            .eq('id', gameSession.id)
            .then(async ({ error }) => {
              if (error) {
                console.error('❌ Database update error:', error);
                toast({
                  title: "Error",
                  description: "Failed to make move",
                  variant: "destructive"
                });
                // Revert optimistic update on error
                setBoard(board);
                setCurrentPlayer(currentPlayer);
                setMoveHistory(moveHistory);
                setIsMakingMove(false);
              } else {
                console.log('✅ Move successfully updated in database');
                // Reset isMakingMove after successful DB update
                setIsMakingMove(false);
                
                // The real-time subscription should handle syncing with other players
                console.log('🔄 Waiting for real-time update to sync with other players...');
              }
            });
          
          // FALLBACK: Ensure isMakingMove is reset even if real-time update fails
          setTimeout(() => {
            setIsMakingMove(false);
          }, 3000);
        } else {
          console.log('❌ Invalid move');
          setSelectedSquare(null);
        }
      }
    } else {
      const piece = board[position.row][position.col];
      if (piece && piece.color === currentPlayer) {
        console.log('✅ Selecting piece:', piece);
        setSelectedSquare(position);
      } else {
        console.log('❌ No valid piece to select');
      }
    }
  }, [board, selectedSquare, currentPlayer, gameSession, playerColor, moveHistory, isMakingMove, toast, user?.id]);

  // Function to join an existing game
const joinGame = async (gameId: string) => {
  // Check if user is logged in and has a game session
  if (!user || !gameId.trim()) {
    console.log('Missing user or gameId:', { user: !!user, gameId: gameId.trim() });
    return;
  }

  console.log('Attempting to join game:', gameId);
  console.log('User ID:', user.id);
  console.log('Supabase client status:', !!supabase);

  try {
    // Added a timeout to catch hanging requests
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), 10000)
    );

    // First, check if the game exists (without status filter to see what's there)
    console.log('Starting database query...');
    
    const queryPromise = supabase
      .from('game_sessions')
      .select('*')
      .eq('id', gameId.trim())
      .single();

    const { data: existingGame, error: fetchError } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any;

    console.log('Database query completed');
    console.log('Fetch result for join:', { 
      existingGame: existingGame ? {
        id: existingGame.id,
        status: existingGame.game_status,
        white_player: existingGame.white_player_id,
        black_player: existingGame.black_player_id
      } : null, 
      fetchError 
    });

    if (fetchError) {
      console.error('Fetch error when joining:', fetchError);
      console.log('Error details:', {
        message: fetchError.message,
        code: fetchError.code,
        hint: fetchError.hint,
        details: fetchError.details
      });
      
      toast({
        title: "Game Not Found",
        description: `Error: ${fetchError.message}`,
        variant: "destructive"
      });
      return;
    }

    if (!existingGame) {
      console.log('No game found with ID:', gameId);
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
      black_player: existingGame.black_player_id,
      created_at: existingGame.created_at
    });

    // Check if user is already in the game
    if (existingGame.white_player_id === user.id) {
      console.log('User is already white player');
      toast({
        title: "Already in Game",
        description: "You are already the white player in this game.",
        variant: "destructive"
      });
      return;
    }

    if (existingGame.black_player_id === user.id) {
      console.log('User is already black player');
      toast({
        title: "Already in Game",
        description: "You are already the black player in this game.",
        variant: "destructive"
      });
      return;
    }

    // Check if game is already full
    if (existingGame.white_player_id && existingGame.black_player_id) {
      console.log('Game is full - both players assigned');
      toast({
        title: "Game Full",
        description: "This game already has two players.",
        variant: "destructive"
      });
      return;
    }

    // Determine which color to assign
    let updateData: any = {};

    console.log('Current game state:', {
      white_player_id: existingGame.white_player_id,
      black_player_id: existingGame.black_player_id,
      game_status: existingGame.game_status
    });

    if (!existingGame.black_player_id) {
      // Black player slot is empty - joiner becomes black
      console.log('Black player slot empty - assigning black');
      updateData = {
        black_player_id: user.id,
        game_status: 'active'
      };
      
    } else {
      console.log('Unexpected state - both slots should not be full at this point');
      toast({
        title: "Game Full",
        description: "This game already has two players.",
        variant: "destructive"
      });
      return;
    }

    console.log('Update data:', updateData);
    console.log('Updating game with ID:', gameId.trim());

    // Join the game
    const updateQueryPromise = supabase
      .from('game_sessions')
      .update(updateData)
      .eq('id', gameId.trim())
      .select()
      .single();

    const { data: updateResult, error: updateError } = await Promise.race([
      updateQueryPromise,
      timeoutPromise
    ]) as any;

    console.log('Update completed');
    console.log('Update result:', { 
      updateResult: updateResult ? {
        id: updateResult.id,
        status: updateResult.game_status,
        white_player: updateResult.white_player_id,
        black_player: updateResult.black_player_id
      } : null, 
      updateError 
    });

    if (updateError) {
      console.error('Update error when joining:', updateError);
      console.log('Update error details:', {
        message: updateError.message,
        code: updateError.code,
        hint: updateError.hint,
        details: updateError.details
      });
      
      toast({
        title: "Error",
        description: `Failed to join the game: ${updateError.message}`,
        variant: "destructive"
      });
      return;
    }

    console.log('Successfully updated game:', updateResult.id);

    // Set up the game session for the joining player
    try {
      console.log('Setting up game session...');
      
      // Handle board state parsing - it might be an object or JSON string
      let parsedBoardState: (ChessPiece | null)[][];
      
      console.log('Board state type:', typeof updateResult.board_state);
      console.log('Board state value:', updateResult.board_state);
      
      if (typeof updateResult.board_state === 'string') {
        console.log('Parsing board state from string');
        parsedBoardState = JSON.parse(updateResult.board_state) as (ChessPiece | null)[][];
      } else if (Array.isArray(updateResult.board_state)) {
        console.log('Using board state as array');
        parsedBoardState = updateResult.board_state as unknown as (ChessPiece | null)[][];
      } else {
        console.error('Invalid board state format from database:', updateResult.board_state);
        parsedBoardState = initialBoard;
      }
      
      console.log('Parsed board state successfully');
      
      setGameSession({
        ...updateResult,
        board_state: parsedBoardState,
        current_turn: updateResult.current_turn as 'white' | 'black',
        game_status: updateResult.game_status as 'waiting' | 'active' | 'completed' | 'abandoned' // this line ensures game_status is set correctly by default
      });
      setBoard(parsedBoardState);
      setCurrentPlayer(updateResult.current_turn as 'white' | 'black');
      setMoveHistory(updateResult.move_history || []);
      // Set playerColor to black since we're joining as black
      setPlayerColor('black');
      //setPlayerColor(playerColor);
      setShowLobby(false);
      
      console.log('Game session setup complete');
      
      toast({
        title: "Success!",
        description: "You have joined the game as Black!",
      });
      
    } catch (parseError) {
      console.error('Error parsing board state when joining:', parseError);
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
    console.log('Error stack:', error.stack);
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    
    toast({
      title: "Error",
      description: `An unexpected error occurred: ${error.message}`,
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
        setAvailableGames([]);
        return;
      }

      if (!data || data.length === 0) {
        setAvailableGames([]);
        return;
      }

      // Fetch creator profiles for available games
      const profileIds = data.map(g => g.white_player_id).filter(Boolean);
      let profileMap: Record<string, any> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', profileIds);
        profileMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
      }

      setAvailableGames(
        data.map(g => ({
          ...g,
          creatorProfile: profileMap[g.white_player_id] || { display_name: 'Unknown', username: 'unknown' }
        }))
      );
    } catch (error) {
      console.error('Unexpected error fetching games:', error);
      setAvailableGames([]);
    }
  };

  // Fetch available games when component mounts
  useEffect(() => {
    fetchAvailableGames();
  }, []);

 // Function to check current game state in database
 const checkCurrentGameState = async () => {
  if (!gameSession) {
    console.log('No active game session');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', gameSession.id)
      .single();

    if (error) {
      console.error('Error fetching current game:', error);
      return;
    }

    console.log('Current game in database:', {
      id: data.id,
      game_status: data.game_status,
      current_turn: data.current_turn,
      board_state: data.board_state,
      move_history: data.move_history
    });

    // Parse and log the board state
    if (typeof data.board_state === 'string') {
      const parsedBoard = JSON.parse(data.board_state);
      console.log('Parsed board state:', parsedBoard);
    } else {
      console.log('Board state (object):', data.board_state);
    }
  } catch (error) {
    console.error('Error checking game state:', error);
  }
};

  // Real-time subscription for available games
  useEffect(() => {
    // Subscribe to INSERT and DELETE events on game_sessions
    const channel = supabase
      .channel('available_games_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
        },
        (payload) => {
          // Only update if the game is in 'waiting' status or was removed
          if (
            (payload.eventType === 'INSERT' && payload.new?.game_status === 'waiting') ||
            (payload.eventType === 'DELETE' && payload.old?.game_status === 'waiting') ||
            (payload.eventType === 'UPDATE' && (payload.new?.game_status === 'waiting' || payload.old?.game_status === 'waiting'))
          ) {
            fetchAvailableGames();
          }
        }
      )
      .subscribe();

    // Also update invited games for the current user
    if (user) {
      supabase
        .from('game_sessions')
        .select('*')
        .eq('black_player_id', user.id)
        .eq('game_status', 'active')
        .order('created_at', { ascending: false })
        .then(async ({ data, error }) => {
          if (!error && data) {
            // Fetch creator profiles for invites
            const profileIds = data.map(g => g.white_player_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, display_name, username')
              .in('id', profileIds);
            const profileMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
            setInvitedGames(data.map(g => ({ ...g, creatorProfile: profileMap[g.white_player_id] })));
          }
        });
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate valid moves for the selected piece
  const getValidMovesForSelectedPiece = useCallback((): Position[] => {
    if (!selectedSquare || !gameSession || gameSession.game_status !== 'active') {
      return [];
    }

    const piece = board[selectedSquare.row][selectedSquare.col];
    if (!piece || piece.color !== playerColor) {
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
  }, [selectedSquare, board, gameSession, playerColor]);

  // Check if it's the current player's turn
  const isPlayerTurn = currentPlayer === playerColor;

  // Update Game State to active when black player joins

  useEffect(() => {
    if (gameSession && gameSession.black_player_id && gameSession.game_status === 'waiting') {
      // Update game status to active when black player joins
      supabase
        .from('game_sessions')
        .update({ game_status: 'active' })
        .eq('id', gameSession.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating game status to active:', error);
          } else {
            setGameSession(prev => prev ? { ...prev, game_status: 'active' } : null);
            setShowLobby(false);
            toast({
              title: "Game Started",
              description: "The game is now active!",
            });
          }
        });
    }
  }, [gameSession]);

  // Update game state based on game session status
  useEffect(() => {
    if (gameSession && gameSession.game_status === 'active') {
      setGameState('playing');
    }
  }, [gameSession]);

  // Real-time subscription for game invites
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('game_invite_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
        },
        (payload) => {
          const newData = payload.new as any;
          // If the current user is invited as black and the game is active
          if (
            newData.black_player_id === user.id &&
            newData.game_status === 'active' &&
            showLobby // Only show if in lobby
          ) {
            toast({
              title: 'Game Invite',
              description: 'You have been invited to a game! Join as Black?',
              action: (
                <button
                  style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#FFA500', color: '#222', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                  onClick={() => {
                    // Set up the game session for the joining player
                    let parsedBoardState;
                    if (typeof newData.board_state === 'string') {
                      parsedBoardState = JSON.parse(newData.board_state);
                    } else if (Array.isArray(newData.board_state)) {
                      parsedBoardState = newData.board_state;
                    } else {
                      parsedBoardState = initialBoard;
                    }
                    setGameSession({
                      ...newData,
                      board_state: parsedBoardState,
                      current_turn: newData.current_turn,
                      game_status: newData.game_status
                    });
                    setBoard(parsedBoardState);
                    setCurrentPlayer(newData.current_turn);
                    setMoveHistory(newData.move_history || []);
                    setPlayerColor('black');
                    setShowLobby(false);
                  }}
                >Join Game</button>
              ),
              duration: 15000
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showLobby, toast]);

  // Manual refresh fallback
  const manualRefreshGameState = async () => {
    if (!gameSession) return;
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', gameSession.id)
        .single();
      if (error) {
        toast({ title: 'Error', description: 'Failed to refresh game state', variant: 'destructive' });
        return;
      }
      let parsedBoardState;
      if (typeof data.board_state === 'string') {
        parsedBoardState = JSON.parse(data.board_state);
      } else if (Array.isArray(data.board_state)) {
        parsedBoardState = data.board_state;
      } else {
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
      // Set playerColor based on user ID
      const isWhitePlayer = data.white_player_id === user?.id;
      const isBlackPlayer = data.black_player_id === user?.id;
      if (isWhitePlayer) setPlayerColor('white');
      else if (isBlackPlayer) setPlayerColor('black');
      else setPlayerColor(null);
      // Reset any stuck states
      setIsMakingMove(false);
      setSelectedSquare(null);
      toast({ title: 'Game state refreshed!' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to refresh game state', variant: 'destructive' });
    }
  };

  // Add a function to reset stuck move state
  const resetMoveState = () => {
    console.log('🔄 Manually resetting move state');
    setIsMakingMove(false);
    setSelectedSquare(null);
    toast({ title: 'Move state reset', description: 'You can now make moves again.' });
  };

  // Function to reload board state from database (fallback mechanism)
  const reloadBoardState = useCallback(async () => {
    if (!gameSession?.id) return;

  checkCurrentGameState();

    console.log('🔄 Reloading board state from database...');
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', gameSession.id)
        .single();
        
      if (error) {
        console.error('❌ Error reloading board state:', error);
        return;
      }
      
      if (!data) {
        console.log('❌ No game data found during reload');
        return;
      }
      
      // Parse board state
      let parsedBoardState: (ChessPiece | null)[][];
      try {
        if (typeof data.board_state === 'string') {
          parsedBoardState = JSON.parse(data.board_state);
        } else if (Array.isArray(data.board_state)) {
          parsedBoardState = data.board_state as unknown as (ChessPiece | null)[][];
        } else {
          console.error('Invalid board state format during reload:', data.board_state);
          return;
        }
      } catch (parseError) {
        console.error('❌ Error parsing board state during reload:', parseError);
        return;
      }
      
      // Check if we have newer data (by move count OR different current turn OR different board state)
      const currentMoveCount = moveHistory.length;
      const dbMoveCount = data.move_history?.length || 0;
      const currentTurn = currentPlayer;
      const dbCurrentTurn = data.current_turn;
      
      // Also check if board states are different by comparing JSON strings
      const currentBoardString = JSON.stringify(board);
      const dbBoardString = JSON.stringify(parsedBoardState);
      
      const hasNewerMoves = dbMoveCount > currentMoveCount;
      const hasDifferentTurn = currentTurn !== dbCurrentTurn;
      const hasDifferentBoard = currentBoardString !== dbBoardString;
      
      console.log('🔄 Comparing game states:', {
        currentMoves: currentMoveCount,
        dbMoves: dbMoveCount,
        currentTurn,
        dbCurrentTurn,
        hasNewerMoves,
        hasDifferentTurn,
        hasDifferentBoard,
        boardsEqual: currentBoardString === dbBoardString
      });
      
      if (hasNewerMoves || hasDifferentTurn || hasDifferentBoard) {
        console.log('🔄 Found differences, updating game state...', {
          reason: hasNewerMoves ? 'newer moves' : hasDifferentTurn ? 'different turn' : 'different board'
        });
        
        // Update all game state
        setGameSession({
          ...gameSession,
          ...data,
          board_state: parsedBoardState,
          current_turn: data.current_turn as 'white' | 'black',
          game_status: data.game_status as 'waiting' | 'active' | 'completed' | 'abandoned'
        });
        
        setBoard(parsedBoardState);
        setCurrentPlayer(data.current_turn as 'white' | 'black');
        setMoveHistory(data.move_history || []);
        
        // Reset any stuck states
        setIsMakingMove(false);
        setSelectedSquare(null);
        
        console.log('✅ Board state reloaded successfully');
        
        // Show a toast notification about the update
        toast({
          title: "Game Updated",
          description: "Board synchronized with latest moves",
          duration: 2000
        });
      } else {
        console.log('🔄 Board state is already up to date');
      }
    } catch (error) {
      console.error('❌ Error during board state reload:', error);
    }
  }, [gameSession?.id, moveHistory.length, gameSession, setGameSession, setBoard, setCurrentPlayer, setMoveHistory]);

  // Periodic board reload for active games (fallback for missed real-time updates)
  useEffect(() => {
    if (!gameSession || gameSession.game_status !== 'active') return;
    
    console.log('🕒 Starting periodic board reload for active game:', gameSession.id);
    
    const reloadInterval = setInterval(() => {
      console.log('🕒 Periodic board reload check...');
      reloadBoardState();
    }, 1000); // Check every 5 seconds for more responsive sync
    
    return () => {
      console.log('🕒 Stopping periodic board reload');
      clearInterval(reloadInterval);
    };
  }, [gameSession?.id, gameSession?.game_status, reloadBoardState]);

  // Exit game handler
  const handleExitGame = async () => {
    // Check if user is logged in and has a game session
    if (!gameSession || !playerColor) {
      setGameSession(null);
      setBoard(initialBoard);
      setCurrentPlayer('white');
      setMoveHistory([]);
      setCapturedPieces({ white: [], black: [] });
      setPlayerColor(null);
      setShowLobby(true);
      //setShowWaiting(false);
      return;
    }

    // Only update DB if game is active and both players are present
    if (gameSession.game_status === 'active' && gameSession.white_player_id && gameSession.black_player_id) {
      let updateData: any = { 
        game_status: 'abandoned',
        winner: playerColor === 'white' ? 'black' : 'white'
      };
      
      try {
        await supabase
          .from('game_sessions')
          .update(updateData)
          .eq('id', gameSession.id);
      } catch (err) {
        console.error('Error updating game on exit:', err);
      }
    }
    
    // Reset local state
    setGameSession(null);
    setBoard(initialBoard);
    setCurrentPlayer('white');
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    setPlayerColor(null);
    setShowLobby(true);
    //setShowWaiting(false);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4 p-8 text-center">
        <h3 className="text-2xl font-bold">See who's playing!</h3>
        <p className="text-muted-foreground max-w-md">
          Sign in to create a new game, join existing matches, and challenge your friends to a game of chess.
        </p>
        <Button 
          onClick={() => navigate('/auth')} 
          className="bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold"
        >
          Sign In to Continue
        </Button>
      </div>
    );
  }

  if (showLobby) {
    return (
      <div className="space-y-4">
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New Game</TabsTrigger>
            <TabsTrigger value="join">Join Existing Game</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="bg-transparent border-none">
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Start a New Match</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                <Button onClick={createGame} className="w-full">
                  Create New Game
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="bg-transparent border-none">
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Join by Game ID</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                <div className="space-y-1">
                  <Label htmlFor="gameId">Game ID</Label>
                  <Input
                    id="gameId"
                    value={joiningGameId}
                    onChange={(e) => setJoiningGameId(e.target.value)}
                    placeholder="Enter game ID..."
                    className="h-9"
                  />
                </div>
                <Button
                  onClick={() => joinGame(joiningGameId)}
                  disabled={!joiningGameId}
                  className="w-full"
                >
                  Join Game
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold">Available Games</h3>
            <Button onClick={fetchAvailableGames} variant="outline" size="sm">Refresh</Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto p-2 rounded-lg bg-black/20">
            {availableGames.length > 0 ? (
              availableGames.map((game) => (
                <Card key={game.id} className="bg-black/30 backdrop-blur-sm border border-white/10">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="truncate pr-4">
                      <p className="font-sans font-semibold text-sm text-white/90 truncate">
                        ID: {game.id} by {game.creatorProfile?.display_name || 'Unknown'} (@{game.creatorProfile?.username || 'unknown'})
                      </p>
                      <p className="text-xs text-white/60">
                        {new Date(game.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      onClick={() => joinGame(game.id)} 
                      size="sm"
                      className="bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold flex-shrink-0"
                    >
                      Join
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                No available games. Create one!
              </div>
            )}
          </div>
        </div>
        
        <FriendsList onInviteFriend={inviteFriend} />

        {/* Invited Games Section */}
        {invitedGames.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-2">Your Invites</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto p-2 rounded-lg bg-black/20">
              {invitedGames.map((game) => (
                <Card key={game.id} className="bg-black/30 backdrop-blur-sm border border-white/10">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="truncate pr-4">
                      <p className="font-sans font-semibold text-sm text-white/90 truncate">
                        ID: {game.id} by {game.creatorProfile?.display_name || 'Unknown'} (@{game.creatorProfile?.username || 'unknown'})
                      </p>
                      <p className="text-xs text-white/60">
                        {new Date(game.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        // Set up the game session for the joining player
                        let parsedBoardState;
                        if (typeof game.board_state === 'string') {
                          parsedBoardState = JSON.parse(game.board_state);
                        } else if (Array.isArray(game.board_state)) {
                          parsedBoardState = game.board_state;
                        } else {
                          parsedBoardState = initialBoard;
                        }
                        setGameSession({
                          ...game,
                          board_state: parsedBoardState,
                          current_turn: game.current_turn,
                          game_status: game.game_status
                        });
                        setBoard(parsedBoardState);
                        setCurrentPlayer(game.current_turn);
                        setMoveHistory(game.move_history || []);
                        setPlayerColor('black');
                        setShowLobby(false);
                      }}
                      size="sm"
                      className="bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold flex-shrink-0"
                    >
                      Join
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // if (showWaiting) {
  //   return (
  //     <div className="flex flex-col items-center justify-center min-h-64 space-y-6 p-8 text-center">
  //       <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[hsl(var(--bonk-orange))]"></div>
  //       <div className="space-y-4">
  //         <h3 className="text-2xl font-bold">Waiting for Opponent</h3>
  //         <p className="text-muted-foreground max-w-md">
  //           Share this game ID with a friend to start playing:
  //         </p>
  //         <div className="flex items-center gap-2 justify-center">
  //           <code className="px-4 py-2 bg-black/20 rounded-lg font-mono text-lg">
  //             {gameSession?.id}
  //           </code>
  //           <Button
  //             onClick={() => {
  //               //setShowWaiting(false);
  //               setShowLobby(true);
  //             }}
  //             size="sm"
  //             variant="outline"
  //           >
  //             Back to Lobby
  //           </Button>
  //         </div>
  //         <p className="text-sm text-muted-foreground">
  //           You'll be playing as White. The game will start automatically when your opponent joins.
  //         </p>
  //       </div>
  //       <Button
  //         onClick={() => {
  //           //setShowWaiting(false);
  //           setShowLobby(true);
  //         }}
  //         variant="outline"
  //       >
  //         Back to Lobby
  //       </Button>
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
      <div className="flex-shrink-0">
        <div className="flex gap-2 mb-2">
          <Button onClick={manualRefreshGameState} variant="outline" className="w-full">Refresh Game State</Button>
          <Button onClick={resetMoveState} variant="outline" className="w-full" disabled={!isMakingMove}>
            Reset Move State
          </Button>
          <Button onClick={handleExitGame} variant="destructive" className="w-full">Exit Game</Button>
        </div>
        {/* Turn Indicator */}
        <div className="mb-4 text-center">
          <div className={cn(
            "inline-block px-6 py-3 rounded-lg font-bold text-lg shadow-lg",
            currentPlayer === 'white' 
              ? "bg-white text-gray-900 border-2 border-gray-300" 
              : "bg-gray-900 text-white border-2 border-gray-600"
          )}>
            {currentPlayer === 'white' ? "♔ White's Turn" : "♚ Black's Turn"}
          </div>
          {playerColor && (
            <p className="text-slate-300 mt-2 text-sm">
              You are playing as {playerColor === 'white' ? 'White' : 'Black'}
            </p>
          )}
        </div>
        
        <ChessBoard
          board={board}
          selectedSquare={selectedSquare}
          onSquareClick={handleSquareClick}
          currentPlayer={currentPlayer}
          validMoves={getValidMovesForSelectedPiece()}
        />
      </div>
      <div className="w-full lg:w-96">
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
