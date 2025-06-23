import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';

const leaderboardData = [
  { id: 1, rank: 1, username: 'cypher', w: 12, d: 3, l: 2, wagered: 2.5, profit: 1.2 },
  { id: 2, rank: 2, username: 'vortex', w: 10, d: 5, l: 4, wagered: 3.1, profit: 0.8 },
  { id: 3, rank: 3, username: 'blaze', w: 8, d: 2, l: 1, wagered: 1.8, profit: 0.9 },
  { id: 4, rank: 4, username: 'specter', w: 5, d: 8, l: 5, wagered: 4.2, profit: -0.5 },
  { id: 5, rank: 5, username: 'raptor', w: 15, d: 1, l: 6, wagered: 5.5, profit: 2.1 },
  { id: 6, rank: 6, username: 'fury', w: 7, d: 7, l: 7, wagered: 2.0, profit: 0.0 },
];

const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4 p-8 text-center">
        <h3 className="text-2xl font-bold">View the Leaderboard</h3>
        <p className="text-muted-foreground max-w-md">
          Sign in to see the top players, track your rank, and compete for the top spot on the leaderboard.
        </p>
        <Button 
          onClick={() => navigate('/auth')} 
          className="bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold"
        >
          Sign In to View
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[hsl(var(--bonk-yellow))] to-[hsl(var(--bonk-orange))] bg-clip-text text-transparent">
        Leaderboard
      </h1>
      <p className="text-black mb-8">
        Top players on the platform, ranked by their performance.
      </p>
      <div className="rounded-lg border border-[hsl(var(--bonk-border))] overflow-hidden bg-[hsl(var(--bonk-card-bg))]">
        <Table>
          <TableHeader>
            <TableRow className="border-[hsl(var(--bonk-border))]">
              <TableHead className="w-[80px] text-black">Rank</TableHead>
              <TableHead className="text-black">Player</TableHead>
              <TableHead className="text-center text-black">Record (W-D-L)</TableHead>
              <TableHead className="text-right text-black">Total Wagered (SOL)</TableHead>
              <TableHead className="text-right text-black">Total Profit (SOL)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboardData.map((player) => (
              <TableRow key={player.id} className="border-[hsl(var(--bonk-border))]">
                <TableCell className="font-bold text-lg text-[hsl(var(--bonk-text))]">{player.rank}</TableCell>
                <TableCell className="font-medium text-[hsl(var(--bonk-text))]">{player.username}</TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 mr-1">{player.w}</Badge>
                  <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20 mr-1">{player.d}</Badge>
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20">{player.l}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-[hsl(var(--bonk-text))]">{player.wagered.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <span className={`font-mono flex items-center justify-end ${player.profit > 0 ? 'text-green-400' : player.profit < 0 ? 'text-red-400' : 'text-[hsl(var(--bonk-text-dark))]'}`}>
                    {player.profit > 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : player.profit < 0 ? <ArrowDown className="h-4 w-4 mr-1" /> : null}
                    {Math.abs(player.profit).toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Leaderboard; 