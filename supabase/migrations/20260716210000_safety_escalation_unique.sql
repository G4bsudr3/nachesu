-- B3: idempotência real na fila de escalações de safety.
-- Hoje a dedup é só check-then-insert na edge function (racy). Este índice único
-- é o backstop no banco: garante no máximo 1 escalação por evento, mesmo sob
-- chamadas concorrentes (trigger + retry).
--
-- Passo 1: remove eventuais duplicatas já existentes (mantém a linha mais antiga
-- por safety_event_id). Passo 2: cria o índice único parcial.

DELETE FROM public.tutor_safety_escalations a
USING public.tutor_safety_escalations b
WHERE a.safety_event_id = b.safety_event_id
  AND a.safety_event_id IS NOT NULL
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tutor_safety_escalation_event
  ON public.tutor_safety_escalations (safety_event_id)
  WHERE safety_event_id IS NOT NULL;
