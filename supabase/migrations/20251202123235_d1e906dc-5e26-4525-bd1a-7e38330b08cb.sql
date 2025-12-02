-- Modify orders table to support custom orders
ALTER TABLE public.orders 
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN is_custom_order BOOLEAN DEFAULT false,
  ADD COLUMN custom_order_title TEXT,
  ADD COLUMN custom_order_description TEXT;

-- Add check constraint to ensure either product_id exists OR it's a custom order
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_product_or_custom_check 
  CHECK (
    (product_id IS NOT NULL AND is_custom_order = false) OR
    (product_id IS NULL AND is_custom_order = true AND custom_order_title IS NOT NULL)
  );

-- Update RLS policies to allow sellers to create custom orders
CREATE POLICY "Sellers can create custom orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id AND 
  is_custom_order = true
);