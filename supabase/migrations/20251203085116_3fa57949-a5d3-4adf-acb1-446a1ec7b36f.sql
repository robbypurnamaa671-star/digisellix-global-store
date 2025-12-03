-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

-- Add is_limited column to profiles for seller account limitation
ALTER TABLE public.profiles ADD COLUMN is_limited BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
USING (true);

CREATE POLICY "Buyers can create reviews for their orders"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = buyer_id AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_id
    AND orders.buyer_id = auth.uid()
    AND orders.payment_status = 'paid'
  )
);

-- Allow viewing profiles of sellers (for showing limited status)
CREATE POLICY "Anyone can view seller profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.id
    AND user_roles.role = 'seller'
  )
);

-- Function to check and limit seller after low rating
CREATE OR REPLACE FUNCTION public.check_seller_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If rating is 3 or below, limit the seller account
  IF NEW.rating <= 3 THEN
    UPDATE public.profiles
    SET is_limited = true
    WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-limit seller on low rating
CREATE TRIGGER on_low_rating_limit_seller
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.check_seller_rating();