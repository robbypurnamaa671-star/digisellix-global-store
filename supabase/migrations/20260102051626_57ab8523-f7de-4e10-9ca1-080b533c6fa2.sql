-- Create escrow_transactions table for standalone escrow service
CREATE TABLE public.escrow_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_code TEXT NOT NULL UNIQUE DEFAULT ('ESC-' || upper(substr(md5(random()::text), 1, 8))),
  
  -- Parties
  buyer_id UUID NOT NULL,
  seller_id UUID,
  seller_email TEXT,
  
  -- Transaction details
  title TEXT NOT NULL,
  description TEXT,
  amount_usd NUMERIC NOT NULL,
  amount_idr NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Fee configuration
  platform_fee_percent NUMERIC NOT NULL DEFAULT 5,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  fee_payer TEXT NOT NULL DEFAULT 'buyer' CHECK (fee_payer IN ('buyer', 'seller', 'split')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'funded', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled')),
  
  -- Payment
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'released', 'refunded')),
  payment_method TEXT,
  payment_reference TEXT,
  escrow_amount NUMERIC DEFAULT 0,
  seller_payout NUMERIC DEFAULT 0,
  
  -- Timeline
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  auto_release_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Dispute handling
  dispute_reason TEXT,
  dispute_by TEXT CHECK (dispute_by IN ('buyer', 'seller')),
  resolution_notes TEXT,
  resolved_by UUID,
  resolution_in_favor TEXT CHECK (resolution_in_favor IN ('buyer', 'seller'))
);

-- Create escrow_messages table for three-party chat
CREATE TABLE public.escrow_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escrow_id UUID NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('buyer', 'seller', 'admin')),
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_system_message BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create escrow_timeline table for tracking events
CREATE TABLE public.escrow_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escrow_id UUID NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  actor_id UUID,
  actor_role TEXT CHECK (actor_role IN ('buyer', 'seller', 'admin', 'system')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_timeline ENABLE ROW LEVEL SECURITY;

-- RLS for escrow_transactions
CREATE POLICY "Buyers can view their escrow transactions"
  ON public.escrow_transactions FOR SELECT
  USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view their escrow transactions"
  ON public.escrow_transactions FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "Admins can view all escrow transactions"
  ON public.escrow_transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Buyers can create escrow transactions"
  ON public.escrow_transactions FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Admins can update escrow transactions"
  ON public.escrow_transactions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS for escrow_messages
CREATE POLICY "Participants can view escrow messages"
  ON public.escrow_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.escrow_transactions et
      WHERE et.id = escrow_id
      AND (et.buyer_id = auth.uid() OR et.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Participants can send escrow messages"
  ON public.escrow_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.escrow_transactions et
      WHERE et.id = escrow_id
      AND (et.buyer_id = auth.uid() OR et.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- RLS for escrow_timeline
CREATE POLICY "Participants can view escrow timeline"
  ON public.escrow_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.escrow_transactions et
      WHERE et.id = escrow_id
      AND (et.buyer_id = auth.uid() OR et.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_timeline;

-- Create indexes
CREATE INDEX idx_escrow_transactions_buyer ON public.escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_transactions_seller ON public.escrow_transactions(seller_id);
CREATE INDEX idx_escrow_transactions_status ON public.escrow_transactions(status);
CREATE INDEX idx_escrow_messages_escrow ON public.escrow_messages(escrow_id);
CREATE INDEX idx_escrow_timeline_escrow ON public.escrow_timeline(escrow_id);