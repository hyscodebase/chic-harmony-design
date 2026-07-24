
-- Allow authenticated users to read their own role rows so SECURITY INVOKER has_role works
GRANT SELECT ON public.user_roles TO authenticated;

-- Switch has_role to SECURITY INVOKER; RLS on user_roles restricts to caller's own rows
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Explicitly ensure no client role can write to user_roles; only service_role may
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
GRANT ALL ON public.user_roles TO service_role;
