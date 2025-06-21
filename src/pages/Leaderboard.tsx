import React from 'react';
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
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
          Leaderboard
        </h1>
        <p className="text-muted-foreground mb-8">
          Top players on the platform, ranked by their performance.
        </p>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Record (W-D-L)</TableHead>
                <TableHead className="text-right">Total Wagered (SOL)</TableHead>
                <TableHead className="text-right">Total Profit (SOL)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-bold text-lg">{player.rank}</TableCell>
                  <TableCell className="font-medium">{player.username}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 mr-1">{player.w}</Badge>
                    <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20 mr-1">{player.d}</Badge>
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20">{player.l}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{player.wagered.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono flex items-center justify-end ${player.profit > 0 ? 'text-green-400' : player.profit < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
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
    </div>
  );
};

export default Leaderboard; 