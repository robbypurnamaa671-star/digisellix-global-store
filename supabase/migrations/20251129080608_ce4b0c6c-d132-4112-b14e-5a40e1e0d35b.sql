-- Add is_featured column to products table for premium ads
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;