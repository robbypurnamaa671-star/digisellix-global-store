-- Create product views tracking table
CREATE TABLE public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT,
  referrer TEXT
);

-- Create index for faster queries
CREATE INDEX idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX idx_product_views_viewed_at ON public.product_views(viewed_at);
CREATE INDEX idx_product_views_session_id ON public.product_views(session_id);

-- Enable Row Level Security
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert views (for tracking)
CREATE POLICY "Anyone can insert product views"
ON public.product_views
FOR INSERT
WITH CHECK (true);

-- Policy: Sellers can view stats for their products
CREATE POLICY "Sellers can view their product stats"
ON public.product_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = product_views.product_id
    AND products.seller_id = auth.uid()
  )
);

-- Policy: Admins can view all stats
CREATE POLICY "Admins can view all product stats"
ON public.product_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'));