
-- 1) novos valores de enum
ALTER TYPE public.deliverable_status ADD VALUE IF NOT EXISTS 'ajuste';
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'deliverable_changes_requested';
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'deliverable_message';

-- 2) trigger de notificação de revisão (substitui o atual para cobrir o estado 'ajuste')
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
      'seu educador pediu um ajuste no módulo ' || COALESCE(v_module_number::TEXT, '?') || ' — ' || COALESCE(v_course_title, 'sua eletiva'),
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
          THEN 'feedback no módulo ' || COALESCE(v_module_number::TEXT, '?') || ' — ' || COALESCE(v_course_title, 'sua eletiva')
        ELSE 'sua entrega do módulo ' || COALESCE(v_module_number::TEXT, '?') || ' foi revisada'
      END,
      v_link,
      jsonb_build_object('deliverable_id', NEW.id, 'module_id', NEW.module_id, 'course_slug', v_course_slug)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) tabela de mensagens (thread) por deliverable
CREATE TABLE IF NOT EXISTS public.deliverable_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id uuid NOT NULL REFERENCES public.module_deliverables(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL DEFAULT 'student',
  body_md text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliverable_messages_deliverable_id ON public.deliverable_messages(deliverable_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.deliverable_messages TO authenticated;
GRANT ALL ON public.deliverable_messages TO service_role;

ALTER TABLE public.deliverable_messages ENABLE ROW LEVEL SECURITY;

-- author validação por trigger
CREATE OR REPLACE FUNCTION public.validate_deliverable_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  IF NEW.author_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'author_id deve ser o próprio usuário';
  END IF;
  IF length(trim(coalesce(NEW.body_md, ''))) < 1 THEN
    RAISE EXCEPTION 'mensagem vazia';
  END IF;
  IF length(NEW.body_md) > 4000 THEN
    RAISE EXCEPTION 'mensagem acima de 4000 caracteres';
  END IF;
  SELECT user_id INTO v_owner FROM public.module_deliverables WHERE id = NEW.deliverable_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'deliverable inexistente';
  END IF;
  IF NEW.author_id = v_owner THEN
    NEW.author_role := 'student';
  ELSE
    NEW.author_role := 'educator';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_deliverable_message ON public.deliverable_messages;
CREATE TRIGGER trg_validate_deliverable_message
BEFORE INSERT ON public.deliverable_messages
FOR EACH ROW EXECUTE FUNCTION public.validate_deliverable_message();

-- RLS policies
CREATE POLICY "aluno e admin leem thread"
ON public.deliverable_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.module_deliverables d
    WHERE d.id = deliverable_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "aluno do deliverable e admin enviam mensagem"
ON public.deliverable_messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.module_deliverables d
      WHERE d.id = deliverable_id AND d.user_id = auth.uid()
    )
  )
);

CREATE POLICY "leitor marca como lido"
ON public.deliverable_messages
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.module_deliverables d
    WHERE d.id = deliverable_id AND d.user_id = auth.uid()
  )
);

-- 4) trigger de notificação ao receber mensagem na thread
CREATE OR REPLACE FUNCTION public.notify_deliverable_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_module_id uuid;
  v_module_number INT;
  v_course_slug TEXT;
  v_course_title TEXT;
  v_target uuid;
  v_link TEXT;
  v_preview TEXT;
BEGIN
  SELECT d.user_id, d.module_id INTO v_owner, v_module_id
  FROM public.module_deliverables d WHERE d.id = NEW.deliverable_id;

  SELECT m.number, c.slug, c.title
  INTO v_module_number, v_course_slug, v_course_title
  FROM public.modules m
  INNER JOIN public.trails t ON t.id = m.trail_id
  INNER JOIN public.courses c ON c.id = t.course_id
  WHERE m.id = v_module_id;

  v_link := CASE
    WHEN v_course_slug IS NOT NULL THEN '/app/eletiva/' || v_course_slug || '/modulo/' || COALESCE(v_module_number::TEXT, '1') || '#feedback-do-educador'
    ELSE '/app/modulo/' || COALESCE(v_module_number::TEXT, '1') || '#feedback-do-educador'
  END;

  v_preview := CASE
    WHEN length(NEW.body_md) > 90 THEN substr(NEW.body_md, 1, 87) || '...'
    ELSE NEW.body_md
  END;

  -- se aluno escreveu, notifica admins responsáveis; se educador escreveu, notifica aluno
  IF NEW.author_role = 'student' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    SELECT ur.user_id,
           'deliverable_message',
           'nova mensagem do aluno',
           v_preview,
           '/admin/feedback',
           jsonb_build_object('deliverable_id', NEW.deliverable_id, 'module_id', v_module_id)
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::app_role;
  ELSE
    v_target := v_owner;
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (
      v_target,
      'deliverable_message',
      'mensagem do educador',
      v_preview,
      v_link,
      jsonb_build_object('deliverable_id', NEW.deliverable_id, 'module_id', v_module_id, 'course_slug', v_course_slug)
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_deliverable_message ON public.deliverable_messages;
CREATE TRIGGER trg_notify_deliverable_message
AFTER INSERT ON public.deliverable_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_deliverable_message();

-- 5) realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverable_messages;
