REVOKE EXECUTE ON FUNCTION public.get_my_future_letter_response(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_future_letter_response(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_future_letter_response(uuid) TO authenticated;