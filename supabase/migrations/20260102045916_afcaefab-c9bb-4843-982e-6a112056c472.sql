-- Create verification status enum
CREATE TYPE public.seller_verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create seller_verifications table
CREATE TABLE public.seller_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ktp_name TEXT NOT NULL,
  ktp_number TEXT NOT NULL,
  ktp_image_url TEXT NOT NULL,
  selfie_image_url TEXT,
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  verification_status public.seller_verification_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id)
);

-- Add escrow_enabled to seller_profiles
ALTER TABLE public.seller_profiles 
ADD COLUMN IF NOT EXISTS escrow_enabled BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_verifications (PRIVATE - only seller and admin)
CREATE POLICY "Sellers can view their own verification"
ON public.seller_verifications
FOR SELECT
USING (seller_id = auth.uid());

CREATE POLICY "Sellers can insert their own verification"
ON public.seller_verifications
FOR INSERT
WITH CHECK (seller_id = auth.uid() AND has_role(auth.uid(), 'seller'));

CREATE POLICY "Sellers can update their pending verification"
ON public.seller_verifications
FOR UPDATE
USING (seller_id = auth.uid() AND verification_status = 'pending')
WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Admins can view all verifications"
ON public.seller_verifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any verification"
ON public.seller_verifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create private storage bucket for KTP images
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-verifications', 'seller-verifications', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for seller-verifications bucket
CREATE POLICY "Sellers can upload their own KTP files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'seller-verifications' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can view their own KTP files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'seller-verifications' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all KTP files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'seller-verifications' 
  AND has_role(auth.uid(), 'admin')
);

-- Trigger to update updated_at
CREATE TRIGGER update_seller_verifications_updated_at
BEFORE UPDATE ON public.seller_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to enable escrow when verification is approved
CREATE OR REPLACE FUNCTION public.handle_verification_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status = 'approved' AND OLD.verification_status != 'approved' THEN
    -- Enable escrow for the seller
    UPDATE public.seller_profiles
    SET escrow_enabled = true,
        verification_status = 'approved'
    WHERE user_id = NEW.seller_id;
    
    -- Set verified_at timestamp
    NEW.verified_at = now();
  ELSIF NEW.verification_status = 'rejected' AND OLD.verification_status != 'rejected' THEN
    -- Disable escrow for the seller
    UPDATE public.seller_profiles
    SET escrow_enabled = false,
        verification_status = 'rejected'
    WHERE user_id = NEW.seller_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for verification approval
CREATE TRIGGER on_verification_status_change
BEFORE UPDATE ON public.seller_verifications
FOR EACH ROW
WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
EXECUTE FUNCTION public.handle_verification_approval();