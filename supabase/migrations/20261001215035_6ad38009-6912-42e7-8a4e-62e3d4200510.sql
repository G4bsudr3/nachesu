create or replace function public.admin_certificate_candidates(_course_id uuid)
returns table(user_id uuid, email text, full_name text, ra text, turma text, display_name text, completed_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  return query
  with mods as (
    select m.id from modules m join trails t on t.id = m.trail_id
    where t.course_id = _course_id and m.published = true
  ), total as (select count(*) n from mods),
  done as (
    select p.user_id, count(*) n, max(p.completed_at) last_at
    from student_module_progress p join mods on mods.id = p.module_id
    where p.completed_at is not null group by p.user_id
  )
  select d.user_id, u.email::text, r.full_name, r.ra, r.turma, pr.display_name, d.last_at
  from done d
  cross join total
  join auth.users u on u.id = d.user_id
  left join profiles pr on pr.user_id = d.user_id
  left join student_roster r on r.email_normalized = lower(u.email)
  where total.n >= 20 and d.n >= total.n
    and coalesce(pr.is_test, false) = false
  order by r.turma nulls last, coalesce(r.full_name, pr.display_name);
end; $$;
revoke all on function public.admin_certificate_candidates(uuid) from public, anon;
grant execute on function public.admin_certificate_candidates(uuid) to authenticated;