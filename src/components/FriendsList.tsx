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
  status: string;
  requester: Profile;
  addressee: Profile;
}

interface FriendRequest {
  id: string;
  status: string;
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
        requester:requester_id(id, username, display_name),
        addressee:addressee_id(id, username, display_name)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (friendsError) {
      console.error('Error fetching friends:', friendsError);
    } else {
      setFriends(friendsData || []);
    }

    // Fetch incoming friend requests
    const { data: requestsData, error: requestsError } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        requester_profile:requester_id (id, username, display_name)
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');
      
    if (requestsError) {
      console.error('Error fetching friend requests:', requestsError);
    } else {
      const validRequests = requestsData.filter(req => req.requester_profile);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
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
            onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
          />
          <Button
            onClick={sendFriendRequest}
            disabled={loading || !searchUsername.trim()}
            className="px-3"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {friendRequests.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-muted-foreground font-semibold text-sm">Friend Requests</h4>
              {friendRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                  <div>
                    <p className="font-medium">{request.requester_profile.display_name}</p>
                    <p className="text-muted-foreground text-sm">@{request.requester_profile.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => acceptFriendRequest(request.id)}
                      variant="default"
                      size="sm"
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => declineFriendRequest(request.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
              <hr className="border-border" />
            </div>
          )}

          {friends.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center">No friends yet. Add some!</p>
          ) : (
            <div className="space-y-2">
              {friends.map((friendship) => {
                const friendProfile = friendship.requester.id === user?.id
                  ? friendship.addressee
                  : friendship.requester;
                return (
                  <div key={friendship.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                    <div>
                      <p className="font-medium">{friendProfile.display_name}</p>
                      <p className="text-muted-foreground text-sm">@{friendProfile.username}</p>
                    </div>
                    <Button
                      onClick={() => onInviteFriend(friendProfile.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Invite
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FriendsList;
