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
  const [showWaiting, setShowWaiting] = useState(false);
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
          
          console.log('Real-time update received:', {
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
              
              // Always set playerColor based on user ID and session
              const isWhitePlayer = updatedSession.white_player_id === user.id;
              const isBlackPlayer = updatedSession.black_player_id === user.id;
              if (isWhitePlayer) setPlayerColor('white');
              else if (isBlackPlayer) setPlayerColor('black');
              else setPlayerColor(null);
              
              console.log('Board state updated to:', parsedBoardState);
            } else {
              console.log('Ignoring older board state update');
            }
            
            // Reset loading state since we received an update
            setIsMakingMove(false);
            
            // Show appropriate notifications based on game status
            const isWhitePlayer = updatedSession.white_player_id === user.id;
            const isBlackPlayer = updatedSession.black_player_id === user.id;
            if (isWhitePlayer || isBlackPlayer) {
              if (updatedSession.game_status === 'active' && updatedSession.white_player_id && updatedSession.black_player_id) {
                setShowLobby(false);
                setShowWaiting(false);
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
  }, [gameSession, user?.id]);

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
      // Show waiting screen for game creator
      setShowLobby(false);
      setShowWaiting(true);
      
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
    console.log('Square clicked:', position);
    console.log('Game state:', { 
      gameSession: gameSession?.id, 
      gameStatus: gameSession?.game_status, 
      gameState, 
      currentPlayer, 
      playerColor, 
      isMakingMove,
      user: user?.id 
    });
    
    if (!gameSession || gameSession.game_status !== 'active') {
      console.log('Game not active');
      return;
    }

    if (currentPlayer !== playerColor) {
      console.log('Not your turn - currentPlayer:', currentPlayer, 'playerColor:', playerColor);
      return;
    }

    if (isMakingMove) {
      console.log('Already making a move, please wait');
      return;
    }

    if (selectedSquare) {
      const piece = board[selectedSquare.row][selectedSquare.col];
      
      if (piece && piece.color === currentPlayer) {
        // Only allow moves that are in getValidMovesForPlayer
        const validMoves = getValidMovesForPlayer(board, currentPlayer);
        const isMoveValid = validMoves.some(
          (move) =>
            move.from.row === selectedSquare.row &&
            move.from.col === selectedSquare.col &&
            move.to.row === position.row &&
            move.to.col === position.col
        );
        if (isMoveValid) {
          console.log('Valid move, making move...');
          setIsMakingMove(true);
          const result = makeMove(board, selectedSquare, position);
          
          const newTurn = currentPlayer === 'white' ? 'black' : 'white';
          const newMoveHistory = [...moveHistory, result.moveNotation];
          
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
              winner:
                result.gameState === 'checkmate'
                  ? (currentPlayer === 'white' ? 'white' : 'black')
                  : result.gameState === 'draw'
                  ? 'draw'
                  : null,
              updated_at: new Date().toISOString() // Force update timestamp
            })
            .eq('id', gameSession.id)
            .then(async ({ error }) => {
              if (error) {
                console.error('Database update error:', error);
                toast({
                  title: "Error",
                  description: "Failed to make move",
                  variant: "destructive"
                });
                setIsMakingMove(false);
              } else {
                console.log('Move successfully updated in database');
                setSelectedSquare(null);
                // Fallback: ensure isMakingMove is reset if real-time update is slow
                setTimeout(() => {
                  setIsMakingMove(false);
                }, 2000);
              }
            });
        } else {
          console.log('Invalid move (would leave king in check)');
          setSelectedSquare(null);
        }
      }
    } else {
      const piece = board[position.row][position.col];
      if (piece && piece.color === currentPlayer) {
        console.log('Selecting piece:', piece);
        setSelectedSquare(position);
      } else {
        console.log('No valid piece to select');
      }
    }
  }, [board, selectedSquare, currentPlayer, gameSession, playerColor, moveHistory, isMakingMove]);

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
      let updateData: any = {};

      console.log('Current game state:', {
        white_player_id: existingGame.white_player_id,
        black_player_id: existingGame.black_player_id
      });

      if (!existingGame.black_player_id) {
        // Black player slot is empty - joiner becomes black
        console.log('Black player slot empty - assigning black');
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
        // Set playerColor to black since we're joining as black
        setPlayerColor('black');
        setShowLobby(false);
        
        toast({
          title: "Success!",
          description: "You have joined the game as Black!",
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

      if (data && data.length > 0) {
        const profileIds = data.map(g => g.white_player_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', profileIds);
        const profileMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
        setAvailableGames(data.map(g => ({ ...g, creatorProfile: profileMap[g.white_player_id] })));
      } else {
        setAvailableGames([]);
      }
    } catch (error) {
      console.error('Unexpected error fetching games:', error);
    }
  };

  // Fetch available games when component mounts
  useEffect(() => {
    fetchAvailableGames();
    // Fetch invited games for the current user
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
  }, [user]);

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
  }, [user, showLobby]);

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
      toast({ title: 'Game state refreshed!' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to refresh game state', variant: 'destructive' });
    }
  };

  // Exit game handler
  const handleExitGame = () => {
    setGameSession(null);
    setBoard(initialBoard);
    setCurrentPlayer('white');
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    setPlayerColor(null);
    setShowLobby(true);
    setShowWaiting(false);
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
                        ID: {game.id} by {game.creatorProfile.display_name} (@{game.creatorProfile.username})
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
                        ID: {game.id} by {game.creatorProfile.display_name} (@{game.creatorProfile.username})
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

  if (showWaiting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-6 p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[hsl(var(--bonk-orange))]"></div>
        <div className="space-y-4">
          <h3 className="text-2xl font-bold">Waiting for Opponent</h3>
          <p className="text-muted-foreground max-w-md">
            Share this game ID with a friend to start playing:
          </p>
          <div className="flex items-center gap-2 justify-center">
            <code className="px-4 py-2 bg-black/20 rounded-lg font-mono text-lg">
              {gameSession?.id}
            </code>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(gameSession?.id || '');
                toast({ title: 'Copied!', description: 'Game ID copied to clipboard.' });
              }}
              size="sm"
              variant="outline"
            >
              Copy
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            You'll be playing as White. The game will start automatically when your opponent joins.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowWaiting(false);
            setShowLobby(true);
          }}
          variant="outline"
        >
          Back to Lobby
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
      <div className="flex-shrink-0">
        <div className="flex gap-2 mb-2">
          <Button onClick={manualRefreshGameState} variant="outline" className="w-full">Refresh Game State</Button>
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
