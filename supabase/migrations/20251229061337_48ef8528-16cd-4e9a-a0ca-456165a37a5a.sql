-- Fix security definer views by using SECURITY INVOKER instead
-- This ensures RLS policies are respected

-- Drop and recreate seller_profiles_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.seller_profiles_public;
CREATE VIEW public.seller_profiles_public 
WITH (security_invoker = on)
AS
SELECT 
  id,
  full_name,
  description,
  avatar_url,
  created_at
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'seller'
);

GRANT SELECT ON public.seller_profiles_public TO anon, authenticated;

-- Drop and recreate reviews_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.reviews_public;
CREATE VIEW public.reviews_public
WITH (security_invoker = on)
AS
SELECT 
  id,
  seller_id,
  order_id,
  rating,
  comment,
  created_at
FROM public.reviews;

GRANT SELECT ON public.reviews_public TO anon, authenticated;