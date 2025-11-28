-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_usd DECIMAL(10, 2) NOT NULL,
  price_idr DECIMAL(12, 2) NOT NULL,
  category TEXT NOT NULL,
  file_url TEXT,
  download_link TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  total_sales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT check_file_or_link CHECK (file_url IS NOT NULL OR download_link IS NOT NULL)
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (status = 'active');

CREATE POLICY "Sellers can view their own products"
  ON public.products FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products"
  ON public.products FOR DELETE
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any product"
  ON public.products FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount_usd DECIMAL(10, 2) NOT NULL,
  amount_idr DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'IDR')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired')),
  payment_method TEXT,
  xendit_invoice_id TEXT UNIQUE,
  xendit_invoice_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view orders for their products"
  ON public.orders FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create downloads table for access control
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(order_id)
);

-- Enable RLS on downloads
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Downloads policies
CREATE POLICY "Buyers can view their own downloads"
  ON public.downloads FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "System can create downloads"
  ON public.downloads FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "System can update downloads"
  ON public.downloads FOR UPDATE
  USING (auth.uid() = buyer_id);

-- Add updated_at triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment product sales
CREATE OR REPLACE FUNCTION public.increment_product_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    UPDATE public.products
    SET total_sales = total_sales + 1
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to increment sales on payment
CREATE TRIGGER increment_sales_on_payment
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_product_sales();

-- Function to create download access on successful payment
CREATE OR REPLACE FUNCTION public.create_download_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    INSERT INTO public.downloads (order_id, buyer_id, product_id)
    VALUES (NEW.id, NEW.buyer_id, NEW.product_id)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to create download access
CREATE TRIGGER create_download_on_payment
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_download_access();