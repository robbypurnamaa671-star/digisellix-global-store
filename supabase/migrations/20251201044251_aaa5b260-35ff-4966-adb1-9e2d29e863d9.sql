-- Update the handle_new_user function to support multiple roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  roles_array text[];
  role_item text;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );

  -- Get roles array from metadata (could be single role or array of roles)
  IF NEW.raw_user_meta_data ? 'roles' THEN
    -- New format: array of roles
    roles_array := ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'roles'));
  ELSIF NEW.raw_user_meta_data ? 'role' THEN
    -- Old format: single role (for backwards compatibility)
    roles_array := ARRAY[NEW.raw_user_meta_data->>'role'];
  ELSE
    -- Default to buyer if no role specified
    roles_array := ARRAY['buyer'];
  END IF;

  -- Insert each role
  FOREACH role_item IN ARRAY roles_array
  LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, role_item::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;