REVOKE EXECUTE ON FUNCTION public.compute_module_metrics(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.compute_module_metrics(uuid) TO authenticated;