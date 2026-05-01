-- drop old expression-based index that doesn't work with onConflict by column names
DROP INDEX IF EXISTS public.hub_insights_scope_user_uidx;

-- partial unique: only one global row
CREATE UNIQUE INDEX IF NOT EXISTS hub_insights_global_uidx
  ON public.hub_insights (scope)
  WHERE scope = 'global';

-- partial unique: one row per user for scope=user
CREATE UNIQUE INDEX IF NOT EXISTS hub_insights_user_uidx
  ON public.hub_insights (scope, user_id)
  WHERE scope = 'user';