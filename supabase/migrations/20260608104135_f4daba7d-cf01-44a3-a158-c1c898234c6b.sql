CREATE OR REPLACE FUNCTION public.admin_unsubmit_deliverable(p_id uuid, p_reason text DEFAULT NULL)
RETURNS public.module_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.module_deliverables;
  v_was_submitted_at timestamptz;
  v_was_status text;
  v_msg text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  SELECT submitted_at, status::text INTO v_was_submitted_at, v_was_status
  FROM public.module_deliverables WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deliverable não encontrado';
  END IF;

  IF v_was_submitted_at IS NULL AND v_was_status = 'rascunho' THEN
    RAISE EXCEPTION 'essa entrega já está em rascunho';
  END IF;

  UPDATE public.module_deliverables
     SET status = 'rascunho'::deliverable_status,
         submitted_at = NULL,
         reviewed_at = NULL,
         reviewer_id = NULL,
         updated_at = now()
   WHERE id = p_id
   RETURNING * INTO v_row;

  v_msg := 'envio desfeito pelo educador. status anterior: ' || v_was_status
        || CASE WHEN v_was_submitted_at IS NOT NULL
                THEN ' (enviado em ' || to_char(v_was_submitted_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ')'
                ELSE '' END
        || CASE WHEN p_reason IS NOT NULL AND length(trim(p_reason)) > 0
                THEN E'\nmotivo: ' || trim(p_reason)
                ELSE '' END;

  INSERT INTO public.deliverable_messages (deliverable_id, author_id, body_md)
  VALUES (p_id, auth.uid(), v_msg);

  RETURN v_row;
END;
$$;