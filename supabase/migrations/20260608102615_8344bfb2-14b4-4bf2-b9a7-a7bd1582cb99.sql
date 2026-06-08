CREATE OR REPLACE FUNCTION public.admin_submit_deliverable(p_id uuid)
RETURNS public.module_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.module_deliverables;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  UPDATE public.module_deliverables
     SET status = 'enviado'::deliverable_status,
         submitted_at = COALESCE(submitted_at, now()),
         updated_at = now()
   WHERE id = p_id
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'deliverable não encontrado';
  END IF;

  INSERT INTO public.deliverable_messages (deliverable_id, author_id, body_md)
  VALUES (p_id, auth.uid(), 'rascunho marcado como enviado pelo educador (conteúdo já estava completo).');

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_submit_deliverable(uuid) TO authenticated;