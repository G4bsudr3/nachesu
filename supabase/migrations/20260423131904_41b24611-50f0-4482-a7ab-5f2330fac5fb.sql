-- 1. nova coluna email_alias
ALTER TABLE public.invited_participants
  ADD COLUMN IF NOT EXISTS email_alias text;

CREATE UNIQUE INDEX IF NOT EXISTS invited_participants_email_alias_unique
  ON public.invited_participants (email_alias)
  WHERE email_alias IS NOT NULL;

-- 2. atualizar trigger pra normalizar alias
CREATE OR REPLACE FUNCTION public.validate_invited_participant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  if new.ctx_experiencia_lovable is not null
     and new.ctx_experiencia_lovable not in ('nunca-usei','ja-mexi','ja-publiquei','uso-diario') then
    raise exception 'ctx_experiencia_lovable inválido: %', new.ctx_experiencia_lovable;
  end if;
  new.email := lower(trim(new.email));
  if new.email_alias is not null then
    new.email_alias := lower(trim(new.email_alias));
    if new.email_alias = '' then
      new.email_alias := null;
    elsif new.email_alias = new.email then
      raise exception 'email_alias não pode ser igual ao email principal';
    end if;
  end if;
  return new;
end$function$;

-- 3. atualizar can_submit_public_fbi pra considerar alias
CREATE OR REPLACE FUNCTION public.can_submit_public_fbi(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.invited_participants
    WHERE email = lower(trim(_email))
       OR email_alias = lower(trim(_email))
  );
$function$;

-- 4. nova função lookup_invited_canonical
CREATE OR REPLACE FUNCTION public.lookup_invited_canonical(_email text)
RETURNS TABLE(canonical_email text, is_alias boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    ip.email AS canonical_email,
    (lower(trim(_email)) = ip.email_alias) AS is_alias
  FROM public.invited_participants ip
  WHERE ip.email = lower(trim(_email))
     OR ip.email_alias = lower(trim(_email))
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.lookup_invited_canonical(text) TO anon, authenticated;