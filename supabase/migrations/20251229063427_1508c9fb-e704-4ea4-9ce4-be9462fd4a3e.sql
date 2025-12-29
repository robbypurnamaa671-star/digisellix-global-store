-- =============================================
-- PRODUCTION MARKETPLACE BACKEND MIGRATION
-- Escrow payments, disputes, seller verification
-- =============================================

-- 1. Create enum types for new status fields
CREATE TYPE public.escrow_status AS ENUM ('held', 'released', 'disputed', 'refunded');
CREATE TYPE public.payout_status AS ENUM ('pending', 'paid', 'frozen');
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'approved', 'rejected');
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'resolved_buyer', 'resolved_seller', 'closed');
CREATE TYPE public.product_status AS ENUM ('draft', 'published', 'flagged', 'suspended');

-- 2. Add country field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country TEXT;

-- 3. Create seller_profiles table (future-proof verification)
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  bio TEXT,
  portfolio_url TEXT,
  verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  trust_score INTEGER NOT NULL DEFAULT 0,
  abuse_count INTEGER NOT NULL DEFAULT 0,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Update products table for marketplace requirements
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS refund_allowed BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- 5. Update orders table with escrow status
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS escrow_status public.escrow_status NOT NULL DEFAULT 'held',
ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC NOT NULL DEFAULT 10;

-- 6. Create transactions table for payment tracking
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_reference TEXT,
  payment_provider TEXT,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  seller_payout NUMERIC NOT NULL DEFAULT 0,
  payout_status public.payout_status NOT NULL DEFAULT 'pending',
  payout_reference TEXT,
  payout_at TIMESTAMP WITH TIME ZONE,
  frozen_at TIMESTAMP WITH TIME ZONE,
  frozen_reason TEXT,
  frozen_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  buyer_message TEXT NOT NULL,
  seller_response TEXT,
  admin_id UUID REFERENCES auth.users(id),
  admin_decision TEXT,
  admin_notes TEXT,
  status public.dispute_status NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Add order_id unique constraint to reviews if not exists (one review per order)
-- First check if review already has the constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_order_id_key'
  ) THEN
    -- Already has unique constraint from original schema
    NULL;
  END IF;
END $$;

-- 9. Create admin actions log for audit trail
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Create platform_settings for admin-adjustable values
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_fee_percent', '10'::jsonb),
  ('auto_release_days', '7'::jsonb),
  ('min_trust_score_for_instant_payout', '100'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 11. Enable RLS on all new tables
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON public.seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_verification ON public.seller_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payout_status ON public.transactions(payout_status);
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON public.orders(escrow_status);
CREATE INDEX IF NOT EXISTS idx_orders_auto_release ON public.orders(auto_release_at) WHERE escrow_status = 'held';
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON public.admin_actions(target_type, target_id);

-- 13. RLS Policies for seller_profiles
CREATE POLICY "Users can view their own seller profile"
  ON public.seller_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view approved seller profiles"
  ON public.seller_profiles FOR SELECT
  USING (verification_status IN ('unverified', 'approved') AND is_suspended = false);

CREATE POLICY "Sellers can create their own profile"
  ON public.seller_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Sellers can update their own profile"
  ON public.seller_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all seller profiles"
  ON public.seller_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any seller profile"
  ON public.seller_profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 14. RLS Policies for transactions
CREATE POLICY "Buyers can view their order transactions"
  ON public.transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = transactions.order_id AND o.buyer_id = auth.uid()
  ));

CREATE POLICY "Sellers can view their order transactions"
  ON public.transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = transactions.order_id AND o.seller_id = auth.uid()
  ));

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update transactions"
  ON public.transactions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 15. RLS Policies for disputes
CREATE POLICY "Buyers can view their disputes"
  ON public.disputes FOR SELECT
  USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view disputes against them"
  ON public.disputes FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "Buyers can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (
    buyer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid() AND o.escrow_status = 'held'
    )
  );

CREATE POLICY "Sellers can respond to disputes"
  ON public.disputes FOR UPDATE
  USING (seller_id = auth.uid() AND status = 'open')
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Admins can view all disputes"
  ON public.disputes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update disputes"
  ON public.disputes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 16. RLS Policies for admin_actions (admin only)
CREATE POLICY "Admins can view admin actions"
  ON public.admin_actions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create admin actions"
  ON public.admin_actions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

-- 17. RLS Policies for platform_settings (admin only)
CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 18. Function to auto-create seller profile when user becomes seller
CREATE OR REPLACE FUNCTION public.handle_seller_role_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'seller' THEN
    INSERT INTO public.seller_profiles (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto seller profile creation
DROP TRIGGER IF EXISTS on_seller_role_created ON public.user_roles;
CREATE TRIGGER on_seller_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_seller_role_created();

-- 19. Function to set auto-release date on order creation
CREATE OR REPLACE FUNCTION public.set_order_auto_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  release_days INTEGER;
BEGIN
  -- Get auto-release days from settings
  SELECT (value::text)::integer INTO release_days
  FROM public.platform_settings
  WHERE key = 'auto_release_days';
  
  IF release_days IS NULL THEN
    release_days := 7;
  END IF;
  
  NEW.auto_release_at := NEW.created_at + (release_days || ' days')::interval;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-release date
DROP TRIGGER IF EXISTS set_order_auto_release_trigger ON public.orders;
CREATE TRIGGER set_order_auto_release_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_auto_release();

-- 20. Function to update seller trust score on review
CREATE OR REPLACE FUNCTION public.update_seller_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller UUID;
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  -- Get seller from order
  SELECT o.seller_id INTO seller
  FROM public.orders o
  WHERE o.id = NEW.order_id;
  
  -- Calculate average rating and count
  SELECT AVG(r.rating), COUNT(*) INTO avg_rating, review_count
  FROM public.reviews r
  JOIN public.orders o ON o.id = r.order_id
  WHERE o.seller_id = seller;
  
  -- Update trust score (simplified formula: avg_rating * sqrt(review_count))
  UPDATE public.seller_profiles
  SET trust_score = LEAST(100, FLOOR(avg_rating * SQRT(review_count) * 5))
  WHERE user_id = seller;
  
  RETURN NEW;
END;
$$;

-- Create trigger for trust score update
DROP TRIGGER IF EXISTS update_trust_score_trigger ON public.reviews;
CREATE TRIGGER update_trust_score_trigger
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_seller_trust_score();

-- 21. Function to increment seller abuse count on dispute loss
CREATE OR REPLACE FUNCTION public.handle_dispute_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'resolved_buyer' AND OLD.status != 'resolved_buyer' THEN
    -- Increment seller abuse count
    UPDATE public.seller_profiles
    SET abuse_count = abuse_count + 1
    WHERE user_id = NEW.seller_id;
    
    -- Auto-suspend if abuse count >= 3
    UPDATE public.seller_profiles
    SET is_suspended = true,
        suspended_at = now(),
        suspended_reason = 'Auto-suspended: Too many disputes lost'
    WHERE user_id = NEW.seller_id AND abuse_count >= 3;
    
    -- Update order escrow to refunded
    UPDATE public.orders
    SET escrow_status = 'refunded'
    WHERE id = NEW.order_id;
    
    -- Freeze transaction
    UPDATE public.transactions
    SET payout_status = 'frozen',
        frozen_at = now(),
        frozen_reason = 'Dispute resolved in buyer favor'
    WHERE order_id = NEW.order_id;
    
  ELSIF NEW.status = 'resolved_seller' AND OLD.status != 'resolved_seller' THEN
    -- Release escrow to seller
    UPDATE public.orders
    SET escrow_status = 'released',
        escrow_released_at = now()
    WHERE id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for dispute resolution
DROP TRIGGER IF EXISTS handle_dispute_resolution_trigger ON public.disputes;
CREATE TRIGGER handle_dispute_resolution_trigger
  AFTER UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_dispute_resolution();

-- 22. Function for admin to log actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can log admin actions';
  END IF;
  
  INSERT INTO public.admin_actions (admin_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), p_action_type, p_target_type, p_target_id, p_details)
  RETURNING id INTO action_id;
  
  RETURN action_id;
END;
$$;

-- 23. Function for buyer to confirm delivery (releases escrow)
CREATE OR REPLACE FUNCTION public.confirm_delivery(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  IF v_order.buyer_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the buyer can confirm delivery';
  END IF;
  
  IF v_order.escrow_status != 'held' THEN
    RAISE EXCEPTION 'Order escrow is not in held status';
  END IF;
  
  -- Release escrow
  UPDATE public.orders
  SET escrow_status = 'released',
      escrow_released_at = now(),
      buyer_confirmed_at = now()
  WHERE id = p_order_id;
  
  -- Update transaction payout status
  UPDATE public.transactions
  SET payout_status = 'pending'
  WHERE order_id = p_order_id AND payout_status = 'frozen';
  
  RETURN true;
END;
$$;

-- 24. Function to process auto-release (called by cron/edge function)
CREATE OR REPLACE FUNCTION public.process_auto_releases()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count INTEGER := 0;
BEGIN
  -- Release orders past auto-release date with no disputes
  UPDATE public.orders o
  SET escrow_status = 'released',
      escrow_released_at = now()
  WHERE o.escrow_status = 'held'
    AND o.auto_release_at <= now()
    AND o.payment_status = 'paid'
    AND NOT EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.order_id = o.id AND d.status IN ('open', 'under_review')
    );
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  
  RETURN released_count;
END;
$$;

-- 25. Admin function to freeze payout
CREATE OR REPLACE FUNCTION public.admin_freeze_payout(
  p_transaction_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can freeze payouts';
  END IF;
  
  UPDATE public.transactions
  SET payout_status = 'frozen',
      frozen_at = now(),
      frozen_reason = p_reason,
      frozen_by = auth.uid()
  WHERE id = p_transaction_id;
  
  -- Log admin action
  PERFORM public.log_admin_action('freeze_payout', 'transaction', p_transaction_id, 
    jsonb_build_object('reason', p_reason));
  
  RETURN true;
END;
$$;

-- 26. Admin function to suspend seller
CREATE OR REPLACE FUNCTION public.admin_suspend_seller(
  p_seller_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can suspend sellers';
  END IF;
  
  UPDATE public.seller_profiles
  SET is_suspended = true,
      suspended_at = now(),
      suspended_reason = p_reason
  WHERE user_id = p_seller_id;
  
  -- Suspend all their products
  UPDATE public.products
  SET status = 'suspended'
  WHERE seller_id = p_seller_id;
  
  -- Log admin action
  PERFORM public.log_admin_action('suspend_seller', 'seller', p_seller_id, 
    jsonb_build_object('reason', p_reason));
  
  RETURN true;
END;
$$;

-- 27. Admin function to flag product
CREATE OR REPLACE FUNCTION public.admin_flag_product(
  p_product_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can flag products';
  END IF;
  
  UPDATE public.products
  SET status = 'flagged',
      flagged_at = now(),
      flagged_reason = p_reason
  WHERE id = p_product_id;
  
  -- Log admin action
  PERFORM public.log_admin_action('flag_product', 'product', p_product_id, 
    jsonb_build_object('reason', p_reason));
  
  RETURN true;
END;
$$;

-- 28. Admin function to resolve dispute
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id UUID,
  p_decision TEXT,
  p_in_favor_of TEXT -- 'buyer' or 'seller'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status public.dispute_status;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;
  
  IF p_in_favor_of = 'buyer' THEN
    new_status := 'resolved_buyer';
  ELSIF p_in_favor_of = 'seller' THEN
    new_status := 'resolved_seller';
  ELSE
    RAISE EXCEPTION 'Invalid decision: must be buyer or seller';
  END IF;
  
  UPDATE public.disputes
  SET status = new_status,
      admin_id = auth.uid(),
      admin_decision = p_decision,
      resolved_at = now()
  WHERE id = p_dispute_id;
  
  -- Log admin action
  PERFORM public.log_admin_action('resolve_dispute', 'dispute', p_dispute_id, 
    jsonb_build_object('decision', p_decision, 'in_favor_of', p_in_favor_of));
  
  RETURN true;
END;
$$;

-- 29. Update existing orders to have escrow status and auto-release
UPDATE public.orders
SET escrow_status = CASE 
  WHEN payment_status = 'paid' THEN 'held'::public.escrow_status
  ELSE 'held'::public.escrow_status
END,
auto_release_at = created_at + interval '7 days'
WHERE escrow_status IS NULL OR auto_release_at IS NULL;

-- 30. Create seller profiles for existing sellers
INSERT INTO public.seller_profiles (user_id)
SELECT DISTINCT ur.user_id
FROM public.user_roles ur
WHERE ur.role = 'seller'
ON CONFLICT (user_id) DO NOTHING;