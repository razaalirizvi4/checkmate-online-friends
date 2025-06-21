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
        description: "Please enter a username",
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
    <div
      className="min-h-screen w-full flex items-center justify-center bg-background p-4"
    >
      <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-xl shadow-2xl overflow-hidden">
        <div className="hidden md:flex flex-col justify-between p-12 bg-slate-900 bg-opacity-80 text-white">
          <div>
            <h1 className="text-4xl font-bold mb-4">Welcome to Chess Master</h1>
            <p className="text-slate-300">
              Join the ultimate online chess platform. Challenge your friends, climb the ranks, and become a true master of the game.
            </p>
          </div>
          <p className="text-sm text-slate-400">&copy; 2025 Chess Master. All rights reserved.</p>
        </div>
        
        <div className="p-8 backdrop-blur-md bg-slate-800/60">
          <Card className="w-full bg-transparent border-none shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-white mb-2">Get Started</CardTitle>
              <CardDescription className="text-slate-300">
                Choose your method to sign in or create an account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900/80 border border-slate-700">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-slate-700/50 border-slate-600 text-white pl-10"
                      />
                    </div>
                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-slate-700/50 border-slate-600 text-white pl-10"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3"
                      disabled={loading}
                    >
                      {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </form>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-800/60 px-2 text-slate-400">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={handleDiscordSignIn}
                    disabled={loading}
                    variant="outline"
                    className="w-full border-slate-600 text-white hover:bg-slate-700/50 flex items-center gap-2 bg-transparent py-3"
                  >
                    <FaDiscord className="h-5 w-5" />
                    Discord
                  </Button>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="bg-slate-700/50 border-slate-600 text-white pl-10"
                      />
                    </div>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-slate-700/50 border-slate-600 text-white pl-10"
                      />
                    </div>
                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Password (min. 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="bg-slate-700/50 border-slate-600 text-white pl-10"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3"
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
      </div>
    </div>
  );
};

export default Auth;
