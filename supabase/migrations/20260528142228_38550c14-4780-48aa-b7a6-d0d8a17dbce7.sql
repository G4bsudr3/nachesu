-- T2.2 + T2.3: sync has_password from auth.users + sanitize nickname

-- 1. Recreate handle_new_user with sanitized nickname/display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _email text := lower(new.email);
  _invited public.invited_participants%rowtype;
  _local text := split_part(new.email,'@',1);
  _clean text := initcap(lower(regexp_replace(_local, '[._\-]+', ' ', 'g')));
begin
  select * into _invited from public.invited_participants
   where email = _email limit 1;

  insert into public.profiles (user_id, display_name, nickname, status, has_password)
  values (
    new.id,
    coalesce(_invited.name, new.raw_user_meta_data ->> 'display_name', _clean),
    coalesce(_invited.nickname, new.raw_user_meta_data ->> 'nickname', _clean),
    case when _invited.id is not null then 'active' else 'pending' end,
    new.encrypted_password is not null
  );

  insert into public.user_roles (user_id, role) values (new.id, 'participant');

  update public.fbi_responses
    set user_id = new.id
    where email = _email
      and user_id is null;

  if _invited.id is not null then
    delete from public.builder_cards where user_id = new.id;
    update public.builder_cards
      set user_id = new.id,
          updated_at = now()
      where user_id = _invited.id;
  end if;

  return new;
end$function$;

-- 2. Trigger to sync has_password when auth.users.encrypted_password changes
CREATE OR REPLACE FUNCTION public.sync_has_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if (new.encrypted_password is distinct from old.encrypted_password) then
    update public.profiles
      set has_password = new.encrypted_password is not null,
          updated_at = now()
      where user_id = new.id;
  end if;
  return new;
end$$;

DROP TRIGGER IF EXISTS on_auth_user_password_change ON auth.users;
CREATE TRIGGER on_auth_user_password_change
AFTER UPDATE OF encrypted_password ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_has_password();

-- 3. Backfill has_password from auth.users for existing users
UPDATE public.profiles p
SET has_password = (u.encrypted_password IS NOT NULL),
    updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id
  AND p.has_password IS DISTINCT FROM (u.encrypted_password IS NOT NULL);

-- 4. Backfill nickname/display_name sanitization for ugly ones (UPPERCASE com ponto)
UPDATE public.profiles
SET nickname = initcap(lower(regexp_replace(nickname, '[._\-]+', ' ', 'g'))),
    updated_at = now()
WHERE nickname ~ '[._\-]' OR nickname = upper(nickname) AND nickname ~ '[A-Z]';

UPDATE public.profiles
SET display_name = initcap(lower(regexp_replace(display_name, '[._\-]+', ' ', 'g'))),
    updated_at = now()
WHERE display_name ~ '[._\-]' AND display_name !~ ' ';
