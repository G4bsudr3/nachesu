CREATE OR REPLACE FUNCTION public.notify_deliverable_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_module_number INT;
  v_course_slug TEXT;
  v_course_title TEXT;
  v_link TEXT;
  v_is_review_change BOOLEAN;
  v_is_ajuste BOOLEAN;
BEGIN
  v_is_review_change := (NEW.reviewed_at IS NOT NULL AND OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at);
  v_is_ajuste := (NEW.status = 'ajuste'::deliverable_status AND OLD.status IS DISTINCT FROM NEW.status);

  IF NOT (v_is_review_change OR v_is_ajuste) THEN
    RETURN NEW;
  END IF;

  SELECT m.number, c.slug, c.title
  INTO v_module_number, v_course_slug, v_course_title
  FROM public.modules m
  INNER JOIN public.trails t ON t.id = m.trail_id
  INNER JOIN public.courses c ON c.id = t.course_id
  WHERE m.id = NEW.module_id;

  v_link := CASE
    WHEN v_course_slug IS NOT NULL THEN '/app/eletiva/' || v_course_slug || '/modulo/' || COALESCE(v_module_number::TEXT, '1') || '#feedback-do-educador'
    ELSE '/app/modulo/' || COALESCE(v_module_number::TEXT, '1') || '#feedback-do-educador'
  END;

  IF v_is_ajuste THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (
      NEW.user_id,
      'deliverable_changes_requested',
      'pedido de ajuste',
      'seu educador pediu um ajuste no módulo ' || COALESCE(v_module_number::TEXT, '?') || ': ' || COALESCE(v_course_title, 'sua eletiva'),
      v_link,
      jsonb_build_object('deliverable_id', NEW.id, 'module_id', NEW.module_id, 'course_slug', v_course_slug)
    );
  ELSIF NEW.status = 'revisado'::deliverable_status THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (
      NEW.user_id,
      'deliverable_reviewed',
      'seu educador respondeu',
      CASE
        WHEN NEW.feedback IS NOT NULL AND LENGTH(NEW.feedback) > 0
          THEN 'feedback no módulo ' || COALESCE(v_module_number::TEXT, '?') || ': ' || COALESCE(v_course_title, 'sua eletiva')
        ELSE 'sua entrega do módulo ' || COALESCE(v_module_number::TEXT, '?') || ' foi revisada'
      END,
      v_link,
      jsonb_build_object('deliverable_id', NEW.id, 'module_id', NEW.module_id, 'course_slug', v_course_slug)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill: substitui em notificações já criadas
UPDATE public.notifications
SET body = replace(body, ' — ', ': ')
WHERE kind IN ('deliverable_reviewed','deliverable_changes_requested')
  AND body LIKE '% — %';
