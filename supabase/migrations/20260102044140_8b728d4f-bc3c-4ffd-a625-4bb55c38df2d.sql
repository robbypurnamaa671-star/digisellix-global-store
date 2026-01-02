-- Add fee_payer column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS fee_payer text NOT NULL DEFAULT 'buyer' CHECK (fee_payer IN ('buyer', 'seller'));

-- Add fee_payer column to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS fee_payer text DEFAULT 'buyer' CHECK (fee_payer IN ('buyer', 'seller'));

-- Add escrow_amount column to transactions (the held amount)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS escrow_amount numeric DEFAULT 0;

-- Insert default platform settings if not exists
INSERT INTO public.platform_settings (key, value) 
VALUES ('platform_fee_percent', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster escrow queries
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON public.orders(escrow_status);
CREATE INDEX IF NOT EXISTS idx_orders_auto_release ON public.orders(auto_release_at) WHERE escrow_status = 'held';