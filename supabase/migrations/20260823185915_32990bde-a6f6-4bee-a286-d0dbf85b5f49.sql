REVOKE EXECUTE ON FUNCTION public.lookup_invited_canonical(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_submit_public_fbi(text) FROM anon, PUBLIC;