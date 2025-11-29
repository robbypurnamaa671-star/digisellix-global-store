-- Update orders table for iPaymu integration
ALTER TABLE public.orders 
  DROP COLUMN IF EXISTS xendit_invoice_id,
  DROP COLUMN IF EXISTS xendit_invoice_url;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS ipaymu_transaction_id text,
  ADD COLUMN IF NOT EXISTS ipaymu_session_id text,
  ADD COLUMN IF NOT EXISTS ipaymu_payment_url text;