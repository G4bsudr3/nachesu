
-- 1. Backfill: linkar fbi_responses órfãos a auth users existentes
UPDATE public.fbi_responses fr
SET user_id = au.id, updated_at = now()
FROM auth.users au
WHERE fr.user_id IS NULL
  AND fr.email IS NOT NULL
  AND lower(au.email) = lower(fr.email);

-- 2. Backfill: transferir builder_cards presos em invited_participant_id pro auth user_id real
-- evita conflito de unicidade removendo card duplicado já existente
WITH stuck AS (
  SELECT bc.id AS card_id, au.id AS new_user_id
  FROM public.builder_cards bc
  JOIN public.invited_participants ip ON ip.id = bc.user_id
  JOIN auth.users au ON lower(au.email) = lower(ip.email)
)
DELETE FROM public.builder_cards
WHERE user_id IN (SELECT new_user_id FROM stuck)
  AND id NOT IN (SELECT card_id FROM stuck);

UPDATE public.builder_cards bc
SET user_id = au.id, updated_at = now()
FROM public.invited_participants ip, auth.users au
WHERE bc.user_id = ip.id
  AND lower(au.email) = lower(ip.email);

-- 3. Trigger: auto-linkar fbi_responses ao auth user
CREATE OR REPLACE FUNCTION public.auto_link_fbi_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.user_id
    FROM auth.users
    WHERE lower(email) = lower(NEW.email)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_link_fbi_user_trigger ON public.fbi_responses;
CREATE TRIGGER auto_link_fbi_user_trigger
BEFORE INSERT OR UPDATE ON public.fbi_responses
FOR EACH ROW EXECUTE FUNCTION public.auto_link_fbi_user();

-- 4. Trigger: auto-transferir builder_cards de invited_participant_id pro auth user_id
CREATE OR REPLACE FUNCTION public.auto_link_builder_card_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _real_uid uuid;
BEGIN
  SELECT au.id INTO _real_uid
  FROM public.invited_participants ip
  JOIN auth.users au ON lower(au.email) = lower(ip.email)
  WHERE ip.id = NEW.user_id;

  IF _real_uid IS NOT NULL AND _real_uid <> NEW.user_id THEN
    DELETE FROM public.builder_cards WHERE user_id = _real_uid AND id <> NEW.id;
    NEW.user_id := _real_uid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_link_builder_card_user_trigger ON public.builder_cards;
CREATE TRIGGER auto_link_builder_card_user_trigger
BEFORE INSERT OR UPDATE ON public.builder_cards
FOR EACH ROW EXECUTE FUNCTION public.auto_link_builder_card_user();
