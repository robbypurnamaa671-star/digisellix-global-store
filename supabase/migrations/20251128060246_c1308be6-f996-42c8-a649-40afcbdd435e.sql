-- Create storage buckets for product files and thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-files', 'product-files', false, 2097152, ARRAY['application/pdf', 'application/zip', 'application/x-zip-compressed', 'image/png', 'image/jpeg', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('product-thumbnails', 'product-thumbnails', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

-- RLS policies for product files bucket (private - only accessible after purchase)
CREATE POLICY "Sellers can upload their product files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can view their own product files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can delete their own product files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Buyers can download purchased product files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-files' AND
  EXISTS (
    SELECT 1 FROM public.downloads d
    INNER JOIN public.products p ON d.product_id = p.id
    WHERE d.buyer_id = auth.uid()
    AND p.file_url LIKE '%' || (storage.objects.name) || '%'
  )
);

-- RLS policies for product thumbnails bucket (public)
CREATE POLICY "Anyone can view product thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-thumbnails');

CREATE POLICY "Sellers can upload product thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can update their product thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can delete their product thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);