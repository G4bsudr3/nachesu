-- 1. Campos novos
ALTER TABLE public.module_pills
  ADD COLUMN IF NOT EXISTS interaction_schema jsonb;

ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS cover_color text;

-- 2. Tabela student_alerts
CREATE TABLE IF NOT EXISTS public.student_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('no_submission_48h', 'list_too_short', 'duplicate_list', 'one_flow_only')),
  raised_at timestamptz NOT NULL DEFAULT now(),
  contacted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_student_alerts_user ON public.student_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_student_alerts_module ON public.student_alerts(module_id);
CREATE INDEX IF NOT EXISTS idx_student_alerts_open ON public.student_alerts(module_id) WHERE contacted_at IS NULL;

ALTER TABLE public.student_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin gerencia alertas"
  ON public.student_alerts
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "aluno vê próprios alertas"
  ON public.student_alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_student_alerts_updated_at
  BEFORE UPDATE ON public.student_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Função compute_module_metrics
CREATE OR REPLACE FUNCTION public.compute_module_metrics(_module_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _total_students integer;
  _completed_count integer;
  _started_count integer;
  _radar_items integer[];
  _median_items numeric;
  _diversity_count integer;
  _avg_minutes numeric;
  _flow_counts jsonb;
BEGIN
  -- Só admin pode chamar
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO _is_admin;
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- Total de alunos = todos com perfil ativo aprovado (não admin)
  SELECT count(*)::int INTO _total_students
  FROM public.profiles p
  WHERE p.status = 'aprovado'
    AND NOT has_role(p.id, 'admin'::app_role);

  -- Iniciaram / concluíram esse módulo
  SELECT
    count(*) FILTER (WHERE smp.started_at IS NOT NULL)::int,
    count(*) FILTER (WHERE smp.completed_at IS NOT NULL)::int
    INTO _started_count, _completed_count
  FROM public.student_module_progress smp
  WHERE smp.module_id = _module_id;

  -- Quantidades de itens no radar (de deliverables enviados)
  SELECT array_agg(
    coalesce(jsonb_array_length(d.content -> 'items'), 0)
  ) INTO _radar_items
  FROM public.module_deliverables d
  WHERE d.module_id = _module_id
    AND d.submitted_at IS NOT NULL;

  -- Mediana de itens
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY x) INTO _median_items
  FROM unnest(coalesce(_radar_items, ARRAY[]::int[])) AS x;

  -- Quantos têm ≥2 fluxos diferentes
  SELECT count(*)::int INTO _diversity_count
  FROM public.module_deliverables d
  WHERE d.module_id = _module_id
    AND d.submitted_at IS NOT NULL
    AND (
      SELECT count(DISTINCT item ->> 'fluxo')
      FROM jsonb_array_elements(d.content -> 'items') item
      WHERE item ->> 'fluxo' IS NOT NULL
    ) >= 2;

  -- Tempo médio em minutos (entre started_at e completed_at)
  SELECT avg(extract(epoch from (smp.completed_at - smp.started_at)) / 60.0) INTO _avg_minutes
  FROM public.student_module_progress smp
  WHERE smp.module_id = _module_id
    AND smp.completed_at IS NOT NULL
    AND smp.started_at IS NOT NULL;

  -- Distribuição de fluxos (todos os items de todas as entregas)
  SELECT coalesce(jsonb_object_agg(flow, cnt), '{}'::jsonb) INTO _flow_counts
  FROM (
    SELECT item ->> 'fluxo' AS flow, count(*) AS cnt
    FROM public.module_deliverables d,
         jsonb_array_elements(d.content -> 'items') item
    WHERE d.module_id = _module_id
      AND d.submitted_at IS NOT NULL
      AND item ->> 'fluxo' IS NOT NULL
    GROUP BY item ->> 'fluxo'
  ) f;

  RETURN jsonb_build_object(
    'total_students', _total_students,
    'started_count', _started_count,
    'completed_count', _completed_count,
    'completion_rate', CASE WHEN _total_students > 0 THEN round((_completed_count::numeric / _total_students) * 100, 1) ELSE 0 END,
    'median_items', coalesce(_median_items, 0),
    'submitted_count', coalesce(array_length(_radar_items, 1), 0),
    'diversity_rate', CASE
      WHEN coalesce(array_length(_radar_items, 1), 0) > 0
      THEN round((_diversity_count::numeric / array_length(_radar_items, 1)) * 100, 1)
      ELSE 0
    END,
    'avg_minutes', round(coalesce(_avg_minutes, 0), 1),
    'flow_distribution', _flow_counts
  );
END;
$$;

-- 4. Bucket privado radar-evidences
INSERT INTO storage.buckets (id, name, public)
VALUES ('radar-evidences', 'radar-evidences', false)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket: aluno gerencia só os próprios (path começa com user_id/), admin lê tudo
CREATE POLICY "aluno upload evidência radar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'radar-evidences'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "aluno lê própria evidência radar"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'radar-evidences'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "aluno apaga própria evidência radar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'radar-evidences'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "aluno atualiza própria evidência radar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'radar-evidences'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );