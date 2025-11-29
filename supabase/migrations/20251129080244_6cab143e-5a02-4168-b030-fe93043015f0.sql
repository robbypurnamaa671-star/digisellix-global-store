-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to view categories
CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);

-- Insert the 7 categories
INSERT INTO public.categories (name) VALUES
  ('AI Tools & Prompts'),
  ('Software & Digital Tools'),
  ('Design & Creative Assets'),
  ('Education & Learning'),
  ('Media & Entertainment'),
  ('Business & Productivity'),
  ('Gaming & Interactive')
ON CONFLICT (name) DO NOTHING;