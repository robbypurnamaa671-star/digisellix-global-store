ALTER VIEW public.public_sellers SET (security_invoker = on);

CREATE POLICY "Public can view seller profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.products pr WHERE pr.seller_id = profiles.id AND pr.status = 'active'));

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, description, avatar_url, country, created_at, updated_at, is_limited) ON public.profiles TO anon, authenticated;