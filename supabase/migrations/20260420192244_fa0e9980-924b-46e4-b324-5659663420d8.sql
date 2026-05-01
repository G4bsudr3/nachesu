CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _email text := lower(new.email);
  _invited public.invited_participants%rowtype;
begin
  select * into _invited from public.invited_participants
   where email = _email limit 1;

  insert into public.profiles (user_id, display_name, nickname, status)
  values (
    new.id,
    coalesce(_invited.name, new.raw_user_meta_data ->> 'display_name', split_part(new.email,'@',1)),
    coalesce(_invited.nickname, new.raw_user_meta_data ->> 'nickname', split_part(new.email,'@',1)),
    case when _invited.id is not null then 'active' else 'pending' end
  );

  insert into public.user_roles (user_id, role) values (new.id, 'participant');

  -- claim orphan fbi_responses (submitted via public form without login)
  update public.fbi_responses
    set user_id = new.id
    where email = _email
      and user_id is null;

  -- reconcile builder_cards: card may have been generated using invited_participant_id as user_id
  -- transfer it to the real auth user_id. delete any pre-existing card for this user first
  -- to avoid unique constraint conflict.
  if _invited.id is not null then
    delete from public.builder_cards where user_id = new.id;
    update public.builder_cards
      set user_id = new.id,
          updated_at = now()
      where user_id = _invited.id;
  end if;

  return new;
end$function$;