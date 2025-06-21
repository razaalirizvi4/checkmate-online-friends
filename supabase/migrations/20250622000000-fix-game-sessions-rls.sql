-- Fix game_sessions table to allow null white_player_id
ALTER TABLE public.game_sessions ALTER COLUMN white_player_id DROP NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Players can view their games" ON public.game_sessions;
DROP POLICY IF EXISTS "Players can create games" ON public.game_sessions;
DROP POLICY IF EXISTS "Players can update their games" ON public.game_sessions;

-- Create new RLS policies that allow creating games with null player IDs
CREATE POLICY "Players can view their games" ON public.game_sessions 
  FOR SELECT USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id OR 
    game_status = 'waiting'
  );

CREATE POLICY "Players can create games" ON public.game_sessions 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update their games" ON public.game_sessions 
  FOR UPDATE USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id OR 
    game_status = 'waiting'
  ); 