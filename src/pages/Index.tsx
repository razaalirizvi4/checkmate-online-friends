import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MultiplayerChess from '../components/MultiplayerChess';
import ChessGame from '../components/ChessGame';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, User, Wallet } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!connection || !publicKey) {
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
  }, [publicKey, connection]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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

  const getShortenedPublicKey = () => {
    if (!publicKey) return '';
    const base58 = publicKey.toBase58();
    return `${base58.slice(0, 3)}...${base58.slice(-3)}`;
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
          
          <div className="flex items-center gap-4">
            {publicKey ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <Wallet className="h-4 w-4 mr-2" />
                    {getShortenedPublicKey()}
                    {balance !== null && (
                      <span className="ml-2 text-xs text-amber-400">
                        ({balance.toFixed(3)} SOL)
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={disconnect}>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => setVisible(true)}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            )}
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

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
