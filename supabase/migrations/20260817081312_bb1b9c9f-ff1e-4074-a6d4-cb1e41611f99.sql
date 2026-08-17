ALTER TABLE public.module_releases DISABLE TRIGGER trg_notify_module_released;

UPDATE public.notifications
SET read_at = now()
WHERE kind = 'module_released'
  AND read_at IS NULL
  AND created_at > now() - interval '3 hours';