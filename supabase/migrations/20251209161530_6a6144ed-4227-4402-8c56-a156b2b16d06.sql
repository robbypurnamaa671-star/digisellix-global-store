-- Add RLS policy for admins to view all conversations
CREATE POLICY "Admins can view all conversations"
ON public.conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all messages
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all profiles (for chat participant names)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all user roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));