
-- ============ user_module_overrides ============
CREATE TABLE public.user_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('module','trail','course')),
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  trail_id uuid REFERENCES public.trails(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  visible boolean NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope='module' AND module_id IS NOT NULL AND trail_id IS NULL AND course_id IS NULL) OR
    (scope='trail'  AND trail_id  IS NOT NULL AND module_id IS NULL AND course_id IS NULL) OR
    (scope='course' AND course_id IS NOT NULL AND module_id IS NULL AND trail_id IS NULL)
  )
);
CREATE UNIQUE INDEX user_module_overrides_uniq_module ON public.user_module_overrides(user_id, module_id) WHERE scope='module';
CREATE UNIQUE INDEX user_module_overrides_uniq_trail  ON public.user_module_overrides(user_id, trail_id)  WHERE scope='trail';
CREATE UNIQUE INDEX user_module_overrides_uniq_course ON public.user_module_overrides(user_id, course_id) WHERE scope='course';
CREATE INDEX user_module_overrides_by_user ON public.user_module_overrides(user_id);

GRANT SELECT ON public.user_module_overrides TO authenticated;
GRANT ALL ON public.user_module_overrides TO service_role;

ALTER TABLE public.user_module_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own overrides" ON public.user_module_overrides
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manages overrides" ON public.user_module_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_user_module_overrides_updated_at
  BEFORE UPDATE ON public.user_module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ admin_audit_log ============
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_kind text,
  target_id uuid,
  target_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_log_actor ON public.admin_audit_log(actor_id, created_at DESC);
CREATE INDEX admin_audit_log_target ON public.admin_audit_log(target_kind, target_id, created_at DESC);
CREATE INDEX admin_audit_log_action ON public.admin_audit_log(action, created_at DESC);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin reads audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
-- nenhuma policy de insert: só via SECURITY DEFINER functions + service_role.

-- ============ helper de insert ============
CREATE OR REPLACE FUNCTION public.write_audit_log(
  _action text, _target_kind text, _target_id uuid, _target_label text, _metadata jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_kind, target_id, target_label, metadata)
  VALUES (auth.uid(), _email, _action, _target_kind, _target_id, _target_label, coalesce(_metadata,'{}'::jsonb));
END;
$$;

-- ============ log_admin_module_view (com throttle 2min) ============
CREATE OR REPLACE FUNCTION public.log_admin_module_view(_module_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last timestamptz;
  _label text;
  _email text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RETURN; END IF;

  SELECT max(created_at) INTO _last
  FROM public.admin_audit_log
  WHERE actor_id = auth.uid() AND action='module_view' AND target_id=_module_id;
  IF _last IS NOT NULL AND _last > now() - interval '2 minutes' THEN RETURN; END IF;

  SELECT c.title || ' · ' || t.title || ' · módulo ' || m.number
    INTO _label
  FROM public.modules m
  JOIN public.trails t ON t.id = m.trail_id
  JOIN public.courses c ON c.id = t.course_id
  WHERE m.id = _module_id;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_kind, target_id, target_label)
  VALUES (auth.uid(), _email, 'module_view', 'module', _module_id, _label);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_module_view(uuid) TO authenticated;

-- ============ triggers de publish (modules + courses) ============
CREATE OR REPLACE FUNCTION public.trg_audit_module_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _label text; _email text;
BEGIN
  IF NEW.published IS DISTINCT FROM OLD.published THEN
    SELECT c.title || ' · ' || t.title || ' · módulo ' || NEW.number
      INTO _label
    FROM public.trails t JOIN public.courses c ON c.id=t.course_id
    WHERE t.id = NEW.trail_id;
    SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_kind, target_id, target_label, metadata)
    VALUES (auth.uid(), _email,
      CASE WHEN NEW.published THEN 'module_publish' ELSE 'module_unpublish' END,
      'module', NEW.id, _label,
      jsonb_build_object('old', OLD.published, 'new', NEW.published));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_modules_publish_audit
  AFTER UPDATE OF published ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_module_publish();

CREATE OR REPLACE FUNCTION public.trg_audit_course_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  IF NEW.published IS DISTINCT FROM OLD.published THEN
    SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_kind, target_id, target_label, metadata)
    VALUES (auth.uid(), _email,
      CASE WHEN NEW.published THEN 'course_publish' ELSE 'course_unpublish' END,
      'course', NEW.id, NEW.title,
      jsonb_build_object('old', OLD.published, 'new', NEW.published));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_courses_publish_audit
  AFTER UPDATE OF published ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_course_publish();

-- ============ triggers de override (insert/update/delete) ============
CREATE OR REPLACE FUNCTION public.trg_audit_override()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _label text; _row record;
BEGIN
  _row := COALESCE(NEW, OLD);
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  IF _row.scope = 'module' THEN
    SELECT c.title || ' · ' || t.title || ' · módulo ' || m.number INTO _label
    FROM public.modules m
    JOIN public.trails t ON t.id=m.trail_id
    JOIN public.courses c ON c.id=t.course_id
    WHERE m.id = _row.module_id;
  ELSIF _row.scope = 'trail' THEN
    SELECT c.title || ' · ' || t.title INTO _label
    FROM public.trails t JOIN public.courses c ON c.id=t.course_id
    WHERE t.id = _row.trail_id;
  ELSE
    SELECT title INTO _label FROM public.courses WHERE id = _row.course_id;
  END IF;

  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_kind, target_id, target_label, metadata)
  VALUES (auth.uid(), _email,
    CASE TG_OP
      WHEN 'INSERT' THEN 'override_create'
      WHEN 'UPDATE' THEN 'override_update'
      ELSE 'override_delete'
    END,
    'user_' || _row.scope,
    COALESCE(_row.module_id, _row.trail_id, _row.course_id),
    _label,
    jsonb_build_object(
      'target_user_id', _row.user_id,
      'visible', _row.visible,
      'scope', _row.scope
    ));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_user_module_overrides_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.user_module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_override();
