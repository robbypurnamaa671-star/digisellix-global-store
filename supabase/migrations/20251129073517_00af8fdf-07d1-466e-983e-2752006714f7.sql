-- Add phone number to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone text;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Users can update their own phone" ON public.profiles;

CREATE POLICY "Users can update their own phone" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);