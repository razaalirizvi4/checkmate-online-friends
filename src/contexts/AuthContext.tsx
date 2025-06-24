import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  username: string;
  display_name: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithDiscord: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async (user: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') { // Profile not found
      // Try to get a username from Discord or fallback
      let username = user.user_metadata?.username || user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.user_metadata?.full_name || user.email?.split('@')[0] || `user_${Date.now()}`;
      let display_name = user.user_metadata?.full_name || user.user_metadata?.username || user.user_metadata?.user_name || user.user_metadata?.preferred_username || 'New Player';
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name,
          username
        })
        .select('username, display_name')
        .single();
      if (insertError) {
        console.error('Error creating profile:', insertError);
      } else if (newProfile) {
        setProfile(newProfile);
      }
    } else if (error) {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    setLoading(true); // Ensure loading is true on mount
    const fetchSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AuthContext] Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        // Fallback: try to get user directly if session is null (e.g., after OAuth redirect)
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          setUser(userData.user);
          await fetchProfile(userData.user);
        }
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state change:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/play`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/play`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setLoading(false);
    setSession(null);
    setUser(null);
  };

  const value = {
    user,
    session,
    profile,
    signUp,
    signIn,
    signInWithDiscord,
    signOut,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
