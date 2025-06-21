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

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 lg:p-6">
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
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex-grow">
            <SidebarSection>
              {!publicKey ? (
                <Button
                  onClick={() => setVisible(true)}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm p-2 bg-slate-700/50 rounded-md">
                    <span className="text-slate-300">{getShortenedPublicKey()}</span>
                    <span className="font-mono text-amber-400">
                      {balance !== null ? `${balance.toFixed(4)} SOL` : '...'}
                    </span>
                  </div>
                  <Button
                    onClick={disconnect}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/80"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect Wallet
                  </Button>
                </div>
              )}
            </SidebarSection>
            
            <SidebarSection>
              {/* Friends List Placeholder */}
              <h3 className="text-lg font-semibold text-slate-300 mb-2 flex items-center"><Users className="h-5 w-5 mr-2"/>Friends</h3>
              <div className="space-y-2 text-sm text-slate-400 p-2 bg-slate-700/50 rounded-md">
                <p>Friends list coming soon...</p>
              </div>
            </SidebarSection>
            
            <SidebarSection>
              {/* Game History Placeholder */}
              <h3 className="text-lg font-semibold text-slate-300 mb-2 flex items-center"><History className="h-5 w-5 mr-2"/>Game History</h3>
              <div className="space-y-2 text-sm text-slate-400 p-2 bg-slate-700/50 rounded-md">
                <p>Game history coming soon...</p>
              </div>
            </SidebarSection>
          </SidebarContent>
          
          <div className="mt-auto">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-slate-400 hover:bg-slate-700/80 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Sidebar>

        <main className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Chess Master
            </h1>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 lg:hidden"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          
          <Tabs defaultValue="multiplayer" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/60 p-1 h-12">
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
