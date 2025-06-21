import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MultiplayerChess from '../components/MultiplayerChess';
import ChessGame from '../components/ChessGame';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, User, Gamepad2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gameId, setGameId] = useState('');
  const [joiningGame, setJoiningGame] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleJoinGame = async () => {
    if (!gameId.trim() || !user) return;

    setJoiningGame(true);
    
    try {
      // First, check if the game exists and is waiting for players
      const { data: gameSession, error: fetchError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', gameId.trim())
        .eq('game_status', 'waiting')
        .single();

      if (fetchError || !gameSession) {
        toast({
          title: "Game Not Found",
          description: "Game ID is invalid or the game is not available to join.",
          variant: "destructive"
        });
        return;
      }

      // Join the game as black player
      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({
          black_player_id: user.id,
          game_status: 'active'
        })
        .eq('id', gameId.trim());

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to join the game. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success!",
        description: "You have successfully joined the game!",
      });

      // Clear the form
      setGameId('');
      
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setJoiningGame(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Chess Master
            </h1>
            <p className="text-slate-300 text-xl">Welcome back, {user.email}</p>
          </div>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Join Game Form */}
        <Card className="bg-slate-800 border-slate-700 mb-8 max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Join Existing Game
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gameId" className="text-slate-300">Game ID</Label>
              <Input
                id="gameId"
                type="text"
                placeholder="Enter game ID..."
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinGame();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleJoinGame}
              disabled={!gameId.trim() || joiningGame}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
            >
              {joiningGame ? 'Joining...' : 'Join Game'}
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="multiplayer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="multiplayer" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Multiplayer
            </TabsTrigger>
            <TabsTrigger value="singleplayer" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Practice
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="multiplayer">
            <MultiplayerChess />
          </TabsContent>
          
          <TabsContent value="singleplayer">
            <ChessGame />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
