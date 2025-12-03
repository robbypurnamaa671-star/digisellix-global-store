-- Allow users to view profiles of people they have conversations with
CREATE POLICY "Users can view profiles of conversation participants"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE (conversations.buyer_id = auth.uid() AND conversations.seller_id = profiles.id)
       OR (conversations.seller_id = auth.uid() AND conversations.buyer_id = profiles.id)
  )
);