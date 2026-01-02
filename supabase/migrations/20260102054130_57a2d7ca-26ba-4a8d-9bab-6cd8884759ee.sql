-- Add RLS policy to allow users to view escrow transactions where their email matches seller_email
CREATE POLICY "Invited sellers can view their escrow invitations"
ON escrow_transactions
FOR SELECT
USING (seller_email = auth.jwt()->>'email');