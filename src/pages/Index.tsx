import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MultiplayerChess from '../components/MultiplayerChess';
import ChessGame from '../components/ChessGame';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, User, Wallet, Sword, History } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
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

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!connected || !publicKey) {
      setBalance(null);
      return;
    }

    connection.getAccountInfo(publicKey).then(info => {
      const newBalance = info ? info.lamports / LAMPORTS_PER_SOL : 0;
      setBalance(newBalance);
    }).catch(error => {
      console.error("Failed to get account info:", error);
      setBalance(null);
    });

    const subscriptionId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
      },
      "confirmed"
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [publicKey, connection, connected]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    if (connected) {
      await disconnect();
    }
    await signOut();
    navigate('/auth');
  };

  const getShortenedPublicKey = () => {
    if (!publicKey) return '';
    const base58 = publicKey.toBase58();
    return `${base58.slice(0, 4)}...${base58.slice(-4)}`;
  };

  const getInitials = (email: string) => {
    const parts = email.split('@');
    return parts[0].slice(0, 2).toUpperCase();
  }

  const leaderboardData = [
    { id: 1, username: 'cypher', w: 12, d: 3, l: 2, wagered: 2.5, profit: 1.2 },
    { id: 2, username: 'vortex', w: 10, d: 5, l: 4, wagered: 3.1, profit: 0.8 },
    { id: 3, username: 'blaze', w: 8, d: 2, l: 1, wagered: 1.8, profit: 0.9 },
    { id: 4, username: 'specter', w: 5, d: 8, l: 5, wagered: 4.2, profit: -0.5 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-6">
      <div className="flex gap-6 max-w-7xl mx-auto">
        <Sidebar className="hidden lg:flex flex-col">
          <SidebarHeader>
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={user.user_metadata.avatar_url} />
                <AvatarFallback>{getInitials(user.email ?? '')}</AvatarFallback>
              </Avatar>
              <div>
                <SidebarTitle>{user.user_metadata.user_name || 'Player'}</SidebarTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex-grow">
            <SidebarSection>
              {!publicKey ? (
                <Button
                  onClick={() => setVisible(true)}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm p-2 bg-secondary rounded-md">
                    <span className="text-muted-foreground">{getShortenedPublicKey()}</span>
                    <span className="font-mono text-accent">
                      {balance !== null ? `${balance.toFixed(4)} SOL` : '...'}
                    </span>
                  </div>
                  <Button
                    onClick={disconnect}
                    variant="outline"
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect Wallet
                  </Button>
                </div>
              )}
            </SidebarSection>
            
            <SidebarSection>
               <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center"><Users className="h-5 w-5 mr-2"/>Leaderboard</h3>
               <div className="space-y-2 text-sm">
                 {leaderboardData.map((player, index) => (
                   <div key={player.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                     <div className="flex items-center gap-2">
                       <span className="font-semibold text-muted-foreground">{index + 1}.</span>
                       <p className="font-medium text-foreground">{player.username}</p>
                     </div>
                     <div className="flex items-center gap-2">
                       <Badge variant="default" className="bg-green-500/20 text-green-400 border-none">{player.w}</Badge>
                       <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-none">{player.d}</Badge>
                       <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-none">{player.l}</Badge>
                     </div>
                   </div>
                 ))}
               </div>
             </SidebarSection>
            
            <SidebarSection>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2 flex items-center"><History className="h-5 w-5 mr-2"/>Game History</h3>
              <div className="space-y-2 text-sm text-muted-foreground p-2 bg-secondary rounded-md">
                <p>Game history coming soon...</p>
              </div>
            </SidebarSection>
          </SidebarContent>
          
          <div className="mt-auto">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Sidebar>

        <main className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              Chess Master
            </h1>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="lg:hidden"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          
          <Tabs defaultValue="multiplayer" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary p-1 h-12">
              <TabsTrigger value="multiplayer" className="text-base">
                <Sword className="h-5 w-5 mr-2" />
                Multiplayer
              </TabsTrigger>
              <TabsTrigger value="singleplayer" className="text-base">
                <User className="h-5 w-5 mr-2" />
                Practice
              </TabsTrigger>
            </TabsList>
            
            <Card className="mt-4 bg-transparent border-none">
              <CardContent className="p-0">
                <TabsContent value="multiplayer" className="mt-0">
                  <MultiplayerChess />
                </TabsContent>
                <TabsContent value="singleplayer" className="mt-0">
                  <ChessGame />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Index;
