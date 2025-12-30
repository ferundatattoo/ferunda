-- Fix function search path for security
ALTER FUNCTION public.is_workspace_member(uuid) SET search_path = public;
ALTER FUNCTION public.trigger_set_updated_at() SET search_path = public;