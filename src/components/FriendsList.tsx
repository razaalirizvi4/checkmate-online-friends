import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Play } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type FriendshipRow = Tables<'friendships'>;

interface Friendship extends FriendshipRow {
  requester: Profile;
  addressee: Profile;
}

interface FriendRequest extends FriendshipRow {
  requester_profile: Profile;
}

interface FriendsListProps {
  onInviteFriend: (friendId: string) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ onInviteFriend }) => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFriendsAndRequests();

      // Real-time subscription for friend requests and friends
      const channel = supabase
        .channel('friendships_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
          },
          (payload) => {
            // Only refetch if the user is involved
            const newData = payload.new as Partial<FriendshipRow> || {};
            const oldData = payload.old as Partial<FriendshipRow> || {};
            if (
              newData.addressee_id === user.id ||
              newData.requester_id === user.id ||
              oldData.addressee_id === user.id ||
              oldData.requester_id === user.id
            ) {
              fetchFriendsAndRequests();
              // Show a toast if a new friend request is received
              if (payload.eventType === 'INSERT' && newData.addressee_id === user.id && newData.status === 'pending') {
                // Try to show the sender's username/display name
                const fetchSenderProfile = async () => {
                  const { data: senderProfile } = await supabase
                    .from('profiles')
                    .select('display_name, username')
                    .eq('id', newData.requester_id)
                    .single();
                  toast({
                    title: 'New Friend Request',
                    description: senderProfile
                      ? `You have a new friend request from ${senderProfile.display_name} (@${senderProfile.username})`
                      : 'You have a new friend request!'
                  });
                };
                fetchSenderProfile();
              }
            }
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchFriendsAndRequests = async () => {
    if (!user) return;

    // Fetch accepted friends
    const { data: friendsData, error: friendsError } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name),
        addressee:profiles!friendships_addressee_id_fkey(id, username, display_name)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (friendsError) {
      console.error('Error fetching friends:', friendsError);
    } else {
      setFriends(friendsData as any || []);
    }

    // Fetch incoming friend requests
    const { data: requestsData, error: requestsError } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        requester_profile:profiles!friendships_requester_id_fkey(id, username, display_name)
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');
      
    if (requestsError) {
      console.error('Error fetching friend requests:', requestsError);
    } else {
      const validRequests = (requestsData as any[]).filter(req => req.requester_profile);
      setFriendRequests(validRequests || []);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Friend request accepted!",
        description: "You are now friends.",
      });
      fetchFriendsAndRequests(); // Refresh lists
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to decline friend request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Friend request declined",
      });
      fetchFriendsAndRequests(); // Refresh lists
    }
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
    <Card className="bg-[hsl(var(--bonk-card-bg))] border-[hsl(var(--bonk-border))]">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--bonk-text))] flex items-center gap-2">
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
            className="bg-black/20 border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text))]"
            onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
          />
          <Button
            onClick={sendFriendRequest}
            disabled={loading || !searchUsername.trim()}
            className="bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold px-3"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-32 overflow-y-auto">
          {friendRequests.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[hsl(var(--bonk-text-dark))] font-semibold text-sm">Friend Requests</h4>
              {friendRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 bg-black/20 rounded">
                  <div>
                    <p className="text-[hsl(var(--bonk-text))] font-medium">{request.requester_profile.display_name}</p>
                    <p className="text-[hsl(var(--bonk-text-dark))] text-sm">@{request.requester_profile.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => acceptFriendRequest(request.id)}
                      className="bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold text-xs px-2 py-1 h-auto"
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => declineFriendRequest(request.id)}
                      className="bg-black/20 hover:bg-black/40 border border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text-dark))] text-xs px-2 py-1 h-auto"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
              <hr className="border-[hsl(var(--bonk-border))]" />
            </div>
          )}

          {friends.length === 0 ? (
            <p className="text-[hsl(var(--bonk-text-dark))] text-sm">No friends yet. Add some friends to play with!</p>
          ) : (
            friends.map((friendship) => {
              const friend = user?.id === friendship.requester.id
                ? friendship.addressee
                : friendship.requester;

              if (!friend) return null;

              return (
                <div key={friendship.id} className="flex items-center justify-between p-2 bg-black/20 rounded">
                  <div>
                    <p className="text-[hsl(var(--bonk-text))] font-medium">{friend.display_name}</p>
                    <p className="text-[hsl(var(--bonk-text-dark))] text-sm">@{friend.username}</p>
                  </div>
                  <Button
                    onClick={() => onInviteFriend(friend.id)}
                    className="bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold"
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
