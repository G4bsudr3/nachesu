create or replace function public.lookup_user_by_email(_email text)
returns table(user_id uuid, has_password boolean)
language sql
stable
security definer
set search_path = public
as $$
  select au.id as user_id, coalesce(p.has_password, false) as has_password
  from auth.users au
  left join public.profiles p on p.user_id = au.id
  where lower(au.email) = lower(trim(_email))
  limit 1;
$$;

revoke all on function public.lookup_user_by_email(text) from public, anon, authenticated;