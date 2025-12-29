-- Add affiliate columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS affiliate_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS affiliate_commission_percent numeric DEFAULT 10 CHECK (affiliate_commission_percent >= 5 AND affiliate_commission_percent <= 50);

-- Create affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create affiliate_clicks table
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create affiliate_commissions table
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'paid')),
  available_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Create payout_requests table
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

-- Add referred_by column to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.affiliates(id);

-- Enable RLS on all new tables
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Affiliates policies
CREATE POLICY "Users can view their own affiliate record"
ON public.affiliates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own affiliate record"
ON public.affiliates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliates"
ON public.affiliates FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Affiliate clicks policies
CREATE POLICY "Affiliates can view their own clicks"
ON public.affiliate_clicks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.affiliates 
  WHERE affiliates.id = affiliate_clicks.affiliate_id 
  AND affiliates.user_id = auth.uid()
));

CREATE POLICY "Anyone can insert clicks"
ON public.affiliate_clicks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sellers can view clicks on their products"
ON public.affiliate_clicks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = affiliate_clicks.product_id 
  AND products.seller_id = auth.uid()
));

CREATE POLICY "Admins can view all clicks"
ON public.affiliate_clicks FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Affiliate commissions policies
CREATE POLICY "Affiliates can view their own commissions"
ON public.affiliate_commissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.affiliates 
  WHERE affiliates.id = affiliate_commissions.affiliate_id 
  AND affiliates.user_id = auth.uid()
));

CREATE POLICY "Sellers can view commissions on their products"
ON public.affiliate_commissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = affiliate_commissions.product_id 
  AND products.seller_id = auth.uid()
));

CREATE POLICY "Admins can view all commissions"
ON public.affiliate_commissions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update commissions"
ON public.affiliate_commissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Payout requests policies
CREATE POLICY "Affiliates can view their own payout requests"
ON public.payout_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.affiliates 
  WHERE affiliates.id = payout_requests.affiliate_id 
  AND affiliates.user_id = auth.uid()
));

CREATE POLICY "Affiliates can create payout requests"
ON public.payout_requests FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.affiliates 
  WHERE affiliates.id = payout_requests.affiliate_id 
  AND affiliates.user_id = auth.uid()
));

CREATE POLICY "Admins can view all payout requests"
ON public.payout_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payout requests"
ON public.payout_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS text
LANGUAGE plpgsql
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

-- Function to update commission status to available after 7 days
CREATE OR REPLACE FUNCTION public.update_available_commissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.affiliate_commissions
  SET status = 'available'
  WHERE status = 'pending'
    AND available_at <= now();
END;
$$;