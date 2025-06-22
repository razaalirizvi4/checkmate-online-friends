import React, { useState } from 'react';
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
  const { signIn, signUp, signInWithDiscord } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
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
      navigate('/');
    }
    
    setLoading(false);
  };

  const handleDiscordSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithDiscord();
    if (error) {
      toast({
        title: "Error signing in with Discord",
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
    }
    // The user will be redirected, so no need to set loading to false here
    // if the sign-in is successful.
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
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bonk-bg-start))] to-[hsl(var(--bonk-bg-end))] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[hsl(var(--bonk-card-bg))] border-[hsl(var(--bonk-border))]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[hsl(var(--bonk-text))]">Bonk Chess</CardTitle>
          <CardDescription className="text-[hsl(var(--bonk-text-dark))]">
            Sign in to play with friends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-[hsl(var(--bonk-text-dark))]">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-black/20 border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text))]"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-[hsl(var(--bonk-text-dark))]">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-black/20 border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text))]"
                    placeholder="••••••••"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[hsl(var(--bonk-border))]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[hsl(var(--bonk-card-bg))] px-2 text-[hsl(var(--bonk-text-dark))]">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button
                onClick={handleDiscordSignIn}
                disabled={loading}
                className="w-full border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text))] hover:bg-black/20 flex items-center gap-2 bg-transparent"
              >
                <FaDiscord className="h-5 w-5" />
                Discord
              </Button>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-[hsl(var(--bonk-text-dark))]">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-black/20 border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text))]"
                    placeholder="bonk_master"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-[hsl(var(--bonk-text-dark))]">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-black/20 border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text))]"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-[hsl(var(--bonk-text-dark))]">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-black/20 border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text))]"
                    placeholder="••••••••"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
