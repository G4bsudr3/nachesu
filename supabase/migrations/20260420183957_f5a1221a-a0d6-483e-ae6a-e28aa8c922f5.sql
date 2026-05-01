
-- 1. Make user_id nullable and add email + invited_participant_id
ALTER TABLE public.fbi_responses
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.fbi_responses
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS invited_participant_id uuid;

-- unique index on email for upsert (only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS fbi_responses_email_unique ON public.fbi_responses (email) WHERE email IS NOT NULL;

-- 2. Security definer function to check if email is invited
CREATE OR REPLACE FUNCTION public.can_submit_public_fbi(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invited_participants
    WHERE email = lower(trim(_email))
  );
$$;

-- 3. RLS: allow anon insert when email is in invited list
CREATE POLICY "anon insere fbi público"
ON public.fbi_responses
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND email IS NOT NULL
  AND public.can_submit_public_fbi(email)
);

CREATE POLICY "anon atualiza fbi público próprio"
ON public.fbi_responses
FOR UPDATE
TO anon
USING (
  user_id IS NULL
  AND email IS NOT NULL
  AND public.can_submit_public_fbi(email)
);

CREATE POLICY "anon lê fbi público próprio"
ON public.fbi_responses
FOR SELECT
TO anon
USING (
  user_id IS NULL
  AND email IS NOT NULL
  AND public.can_submit_public_fbi(email)
);

-- 4. Update handle_new_user to claim orphan fbi_responses
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  return new;
end$$;
