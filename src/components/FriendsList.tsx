
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Play } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  profiles: Profile;
}

interface FriendsListProps {
  onInviteFriend: (friendId: string) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ onInviteFriend }) => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        profiles:addressee_id (id, username, display_name)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    setFriends(data || []);
  };

  const sendFriendRequest = async () => {
    if (!user || !searchUsername.trim()) return;

    setLoading(true);

    // First, find the user by username
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', searchUsername.trim())
      .single();

    if (profileError || !profiles) {
      toast({
        title: "User not found",
        description: "No user found with that username",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (profiles.id === user.id) {
      toast({
        title: "Cannot add yourself",
        description: "You cannot send a friend request to yourself",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    // Send friend request
    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: profiles.id,
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        toast({
          title: "Friend request already exists",
          description: "You've already sent a request to this user",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send friend request",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Friend request sent",
        description: `Sent friend request to ${searchUsername}`
      });
      setSearchUsername('');
    }

    setLoading(false);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="h-5 w-5" />
          Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter username"
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
            onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
          />
          <Button
            onClick={sendFriendRequest}
            disabled={loading || !searchUsername.trim()}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {friends.length === 0 ? (
            <p className="text-slate-400 text-sm">No friends yet. Add some friends to play with!</p>
          ) : (
            friends.map((friendship) => {
              const friend = friendship.profiles;
              return (
                <div key={friendship.id} className="flex items-center justify-between p-2 bg-slate-700 rounded">
                  <div>
                    <p className="text-white font-medium">{friend.display_name}</p>
                    <p className="text-slate-400 text-sm">@{friend.username}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onInviteFriend(friend.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Invite
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FriendsList;
