-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Sellers can upload product files" ON storage.objects;
  DROP POLICY IF EXISTS "Sellers can view their own product files" ON storage.objects;
  DROP POLICY IF EXISTS "Sellers can upload thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;
END $$;

-- Add RLS policies for product-files storage bucket
CREATE POLICY "Sellers can upload product files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-files' AND
  (storage.foldername(name))[1] = 'products' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Sellers can view their own product files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-files' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Add RLS policies for product-thumbnails storage bucket
CREATE POLICY "Sellers can upload thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-thumbnails' AND
  (storage.foldername(name))[1] = 'thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Anyone can view thumbnails"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-thumbnails');