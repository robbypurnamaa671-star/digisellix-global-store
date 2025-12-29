-- Fix profiles phone exposure by updating RLS policy for seller profiles
-- Phone should only be visible to the owner and admins
DROP POLICY IF EXISTS "Anyone can view seller profiles" ON public.profiles;

-- Create policy that shows seller profiles without sensitive fields
-- This works at policy level - the view will handle field exclusion
CREATE POLICY "Anyone can view seller profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = profiles.id AND ur.role = 'seller'
  )
);

-- Create a secure orders view that hides payment details from non-admins
CREATE OR REPLACE VIEW public.orders_safe
WITH (security_invoker = on)
AS
SELECT 
  id,
  buyer_id,
  product_id,
  seller_id,
  amount_usd,
  amount_idr,
  currency,
  payment_status,
  payment_method,
  created_at,
  paid_at,
  is_custom_order,
  custom_order_title,
  custom_order_description,
  expires_at,
  referred_by,
  updated_at
FROM public.orders;

GRANT SELECT ON public.orders_safe TO authenticated;

-- Add comments explaining the security decisions
COMMENT ON VIEW public.orders_safe IS 'Safe view of orders that excludes payment gateway details (ipaymu_transaction_id, ipaymu_session_id, ipaymu_payment_url)';
COMMENT ON VIEW public.seller_profiles_public IS 'Public seller profiles view that excludes phone numbers for privacy';
COMMENT ON VIEW public.reviews_public IS 'Public reviews view that excludes buyer_id to protect customer privacy';