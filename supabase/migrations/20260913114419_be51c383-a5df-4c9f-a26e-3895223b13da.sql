REVOKE EXECUTE ON FUNCTION public.admin_project_links(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_triage_candidates(uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_triage_pending_count(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_bulk_review_deliverables(uuid[], text, numeric) FROM PUBLIC, anon;