-- SobreAI hardening — infraestrutura de rate limiting (SEC-11)
-- Tabela de contadores por janela + RPC atômica usada pelas edge functions
-- públicas (validate-public-email, check-sebrae-eligibility, submit-public-fbi).
-- Só o service_role acessa; o limiter é fail-open no lado da função.

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  bucket_key   text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- Sem policies → nega tudo para anon/authenticated; só service_role (que
-- bypassa RLS) e a RPD SECURITY DEFINER abaixo tocam a tabela.
GRANT ALL ON public.rate_limit_counters TO service_role;

CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON public.rate_limit_counters (window_start);

-- check_rate_limit: incrementa o contador da janela atual e devolve
-- TRUE se ainda dentro do limite, FALSE se excedido.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _limit integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  win_start timestamptz;
  current_hits integer;
BEGIN
  IF _key IS NULL OR _limit IS NULL OR _window_seconds IS NULL OR _window_seconds <= 0 THEN
    RETURN true; -- entrada inválida → fail-open
  END IF;

  -- início da janela deslizante (alinhado ao tamanho da janela)
  win_start := to_timestamp(
    floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds
  );

  INSERT INTO public.rate_limit_counters (bucket_key, window_start, hits)
  VALUES (_key, win_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET hits = public.rate_limit_counters.hits + 1
  RETURNING hits INTO current_hits;

  -- limpeza oportunística de janelas antigas (barata, sem job dedicado)
  DELETE FROM public.rate_limit_counters
  WHERE window_start < now() - interval '1 hour';

  RETURN current_hits <= _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
