REVOKE EXECUTE ON FUNCTION public.cleanup_tutor_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_tutor_events() TO service_role;