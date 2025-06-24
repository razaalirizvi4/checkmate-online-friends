import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MultiplayerChess from '../components/MultiplayerChess';
import ChessGame from '../components/ChessGame';
import Leaderboard from '../components/Leaderboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, User, Wallet, Sword, History, Trophy, LogIn } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSection,
  SidebarTitle,
} from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import SocialLinks from '@/components/SocialLinks';

const Index = () => {
  const { user, signOut, profile, loading } = useAuth();
  const navigate = useNavigate();

  // Controlled tab state
  const [selectedTab, setSelectedTab] = React.useState(user ? "multiplayer" : "singleplayer");
  React.useEffect(() => {
    setSelectedTab(user ? "multiplayer" : "singleplayer");
  }, [user]);

  if (loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xl text-[hsl(var(--bonk-text))] animate-pulse">Loading...</span>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (email: string) => {
    if (!email) return 'G';
    const parts = email.split('@');
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bonk-bg-start))] to-[hsl(var(--bonk-bg-end))] text-[hsl(var(--bonk-text))] p-2 lg:p-4">
      <div className="flex gap-4 max-w-screen-xl mx-auto">
        <Sidebar className="hidden lg:flex flex-col bg-[hsl(var(--bonk-card-bg))] border-[hsl(var(--bonk-border))] rounded-lg">
          <SidebarHeader>
            {user ? (
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={user.user_metadata.avatar_url} />
                  <AvatarFallback>{getInitials(user.email ?? '')}</AvatarFallback>
                </Avatar>
                <div>
                  <SidebarTitle className="text-[hsl(var(--bonk-text))]">{profile?.display_name || 'Player'}</SidebarTitle>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>G</AvatarFallback>
                </Avatar>
                <div>
                  <SidebarTitle className="text-[hsl(var(--bonk-text))]">Guest</SidebarTitle>
                </div>
              </div>
            )}
          </SidebarHeader>
          <SidebarContent className="flex-grow">
            {user && (
              <SidebarSection>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm p-2 bg-black/20 rounded-md">
                    <span className="text-[hsl(var(--bonk-text-dark))]">Wallet</span>
                    <span className="font-mono text-[hsl(var(--bonk-orange))]">
                      Coming Soon
                    </span>
                  </div>
                  <Button
                    disabled
                    variant="outline"
                    className="w-full border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text-dark))] hover:bg-black/20"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </Button>
                </div>
              </SidebarSection>
            )}
          </SidebarContent>
          
          <div className="mt-auto p-4 border-t border-[hsl(var(--bonk-border))]">
            {user ? (
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full justify-start text-black hover:bg-black/20 hover:text-[hsl(var(--bonk-text))]"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                variant="ghost"
                className="w-full justify-start text-[hsl(var(--bonk-text-dark))] hover:bg-black/20 hover:text-[hsl(var(--bonk-text))]"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </Sidebar>

        <main className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[hsl(var(--bonk-yellow))] to-[hsl(var(--bonk-orange))] bg-clip-text text-transparent">
              Bonk Chess
            </h1>
            {user ? (
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="lg:hidden border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text-dark))] hover:bg-[hsl(var(--bonk-card-bg))]"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="lg:hidden border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text-dark))] hover:bg-[hsl(var(--bonk-card-bg))]"
              >
                <LogIn className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="multiplayer">
                <Sword className="h-5 w-5 mr-2" />
                Multiplayer
              </TabsTrigger>
              <TabsTrigger value="leaderboard">
                <Trophy className="h-5 w-5 mr-2" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="history" disabled>
                <History className="h-5 w-5 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="singleplayer">
                <User className="h-5 w-5 mr-2" />
                Practice
              </TabsTrigger>
            </TabsList>
            
            <Card className="mt-2 bg-transparent border-none">
              <CardContent className="p-0">
                <TabsContent value="multiplayer" className="mt-0">
                  <MultiplayerChess />
                </TabsContent>
                <TabsContent value="leaderboard" className="mt-0">
                  <Leaderboard />
                </TabsContent>
                <TabsContent value="history" className="mt-0">
                  <div className="text-center p-8 text-[hsl(var(--bonk-text-dark))]">
                    Game history coming soon...
                  </div>
                </TabsContent>
                <TabsContent value="singleplayer" className="mt-0">
                  <ChessGame />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </main>
      </div>
      <SocialLinks />
    </div>
  );
};

export default Index;
