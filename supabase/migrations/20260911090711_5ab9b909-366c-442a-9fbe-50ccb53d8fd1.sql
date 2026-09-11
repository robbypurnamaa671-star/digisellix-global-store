CREATE OR REPLACE VIEW public.public_sellers AS
SELECT
  p.id,
  p.full_name,
  p.description,
  p.avatar_url,
  p.country,
  p.created_at,
  trim(both '-' from regexp_replace(lower(coalesce(p.full_name,'seller')), '[^a-z0-9]+', '-', 'g')) AS slug
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.products pr WHERE pr.seller_id = p.id AND pr.status = 'active'
);

GRANT SELECT ON public.public_sellers TO anon, authenticated;
GRANT ALL ON public.public_sellers TO service_role;