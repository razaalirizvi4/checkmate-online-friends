import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    console.log('[Landing.tsx] useEffect', { loading, user });
    if (!loading && user) {
      console.log('[Landing.tsx] Redirecting to /play');
      navigate('/play', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bonk-bg-start))] to-[hsl(var(--bonk-bg-end))] flex flex-col items-center justify-center text-white p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-[hsl(var(--bonk-yellow))] to-[hsl(var(--bonk-orange))] bg-clip-text text-transparent mb-8">
          Bonk Chess
        </h1>
        <img 
          src="/assets/landing.png" 
          alt="Bonk Chess" 
          className="max-w-md w-full mx-auto rounded-lg shadow-2xl mb-12 border-4 border-[hsl(var(--bonk-border))]"
        />
        <div className="flex justify-center gap-4">
          <Button asChild size="lg" className="bg-[hsl(var(--bonk-orange))] hover:bg-[hsl(var(--bonk-orange-dark))] text-black font-bold px-8 py-6 text-lg">
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[hsl(var(--bonk-border))] text-[hsl(var(--bonk-text))] hover:bg-black/20 hover:text-white px-8 py-6 text-lg">
            <Link to="/play">Go to Practice</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing; 