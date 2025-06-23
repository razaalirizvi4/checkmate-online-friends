import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { FaDiscord } from 'react-icons/fa';
import { FiUser, FiMail, FiLock } from 'react-icons/fi';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithDiscord, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('[Auth.tsx] useEffect', { authLoading, user });
    if (!authLoading && user) {
      console.log('[Auth.tsx] Redirecting to /play');
      navigate('/play', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: "Error signing in",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Signed in successfully!"
        });
        navigate('/play');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordSignIn = async () => {
    const { error } = await signInWithDiscord();
    if (error) {
      toast({
        title: "Error signing in with Discord",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter your username",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await signUp(email, password, username);
      
      if (error) {
        toast({
          title: "Error signing up",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Account created! Check your email to verify your account.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bonk-bg-start))] to-[hsl(var(--bonk-bg-end))] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[hsl(var(--bonk-card-bg))] border-[hsl(var(--bonk-border))]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[hsl(var(--bonk-text))]">Bonk Chess</CardTitle>
          <CardDescription className="text-black">
            Sign in with Discord to play with friends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDiscordSignIn}
            className="w-full border-[hsl(var(--bonk-border))] text-black hover:bg-black/20 flex items-center gap-2 bg-transparent font-bold"
          >
            <FaDiscord className="h-5 w-5" />
            Sign in with Discord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
