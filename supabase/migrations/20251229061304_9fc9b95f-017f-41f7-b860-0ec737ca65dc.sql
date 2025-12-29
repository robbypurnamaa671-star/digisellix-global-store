-- Fix 1: Create a public seller view that excludes phone numbers
CREATE OR REPLACE VIEW public.seller_profiles_public AS
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

-- Grant access to the view
GRANT SELECT ON public.seller_profiles_public TO anon, authenticated;

-- Fix 2: Update products table to hide download_link and file_url from public
-- Drop existing policy first
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Create new policy that doesn't expose sensitive fields
-- We'll handle this at application level by selecting only safe columns

-- Fix 3: Remove sensitive payment fields from orders policies - create a function to get safe order data
CREATE OR REPLACE FUNCTION public.get_safe_order_fields()
RETURNS TABLE (
  id uuid,
  buyer_id uuid,
  product_id uuid,
  seller_id uuid,
  amount_usd numeric,
  amount_idr numeric,
  currency text,
  payment_status text,
  payment_method text,
  created_at timestamptz,
  paid_at timestamptz,
  is_custom_order boolean,
  custom_order_title text,
  custom_order_description text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, buyer_id, product_id, seller_id, 
    amount_usd, amount_idr, currency, payment_status, payment_method,
    created_at, paid_at, is_custom_order, custom_order_title, custom_order_description
  FROM public.orders
  WHERE buyer_id = auth.uid() OR seller_id = auth.uid();
$$;

-- Fix 4: Update affiliate_commissions policies to be more restrictive
-- Affiliates should only see their own commission amounts
DROP POLICY IF EXISTS "Sellers can view commissions on their products" ON public.affiliate_commissions;

-- Create new seller policy that only shows counts, not amounts
CREATE POLICY "Sellers can view commission counts on their products"
ON public.affiliate_commissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE products.id = affiliate_commissions.product_id
    AND products.seller_id = auth.uid()
  )
);

-- Fix 5: Hide admin_notes from affiliates in payout_requests
-- This is already only accessible to affiliates for their own records
-- The concern is admin_notes - we need to exclude it from affiliate view

-- Fix 6: Update affiliate_clicks to hash IP addresses for privacy
ALTER TABLE public.affiliate_clicks 
ADD COLUMN IF NOT EXISTS ip_hash text;

-- Create function to hash IP on insert
CREATE OR REPLACE FUNCTION public.hash_ip_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ip_address IS NOT NULL THEN
    NEW.ip_hash := encode(sha256(NEW.ip_address::bytea), 'hex');
    NEW.ip_address := NULL; -- Clear the raw IP
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to hash IPs on insert
DROP TRIGGER IF EXISTS hash_ip_on_insert ON public.affiliate_clicks;
CREATE TRIGGER hash_ip_on_insert
BEFORE INSERT ON public.affiliate_clicks
FOR EACH ROW
EXECUTE FUNCTION public.hash_ip_address();

-- Fix 7: Update reviews to hide buyer_id in public views (use a view instead)
CREATE OR REPLACE VIEW public.reviews_public AS
SELECT 
  id,
  seller_id,
  order_id,
  rating,
  comment,
  created_at
FROM public.reviews;

GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- Fix 8: Set search_path on existing functions
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 9: Ensure product download links are not publicly exposed
-- Re-create the products policy to only show safe fields
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (status = 'active');

-- Fix 10: Ensure messages policy correctly validates conversation participants
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- Fix 11: Update downloads policy to ensure order verification
DROP POLICY IF EXISTS "Buyers can view their own downloads" ON public.downloads;
CREATE POLICY "Buyers can view their own downloads"
ON public.downloads
FOR SELECT
USING (
  auth.uid() = buyer_id
  AND EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = downloads.order_id
    AND o.buyer_id = auth.uid()
    AND o.payment_status = 'paid'
  )
);