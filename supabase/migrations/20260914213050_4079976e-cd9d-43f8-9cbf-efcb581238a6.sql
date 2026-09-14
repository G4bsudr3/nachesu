create or replace function public.admin_cohort_report(_cohort_id uuid)
returns table (
  course_id uuid,
  course_title text,
  user_id uuid,
  email text,
  full_name text,
  display_name text,
  turma text,
  modules_completed bigint,
  modules_total bigint,
  reached_m20 boolean,
  completed_m20 boolean,
  final_delivered boolean,
  final_status text,
  final_submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with mods as (
    select m.id, m.number, t.course_id
    from public.modules m
    join public.trails t on t.id = m.trail_id
  ),
  members as (
    select m.user_id, u.email::text as email, p.display_name, r.full_name, r.turma
    from public.cohort_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
    left join public.student_roster r on r.email_normalized = lower(u.email)
    where m.cohort_id = _cohort_id
  )
  select
    c.id as course_id,
    c.title as course_title,
    mb.user_id,
    mb.email,
    mb.full_name,
    mb.display_name,
    mb.turma,
    (select count(*) from public.student_module_progress sp
       join mods md on md.id = sp.module_id
      where sp.user_id = mb.user_id and md.course_id = c.id and sp.completed_at is not null) as modules_completed,
    (select count(*) from mods md where md.course_id = c.id) as modules_total,
    exists (select 1 from public.student_module_progress sp
              join mods md on md.id = sp.module_id
             where sp.user_id = mb.user_id and md.course_id = c.id and md.number = 20) as reached_m20,
    exists (select 1 from public.student_module_progress sp
              join mods md on md.id = sp.module_id
             where sp.user_id = mb.user_id and md.course_id = c.id and md.number = 20
               and sp.completed_at is not null) as completed_m20,
    exists (select 1 from public.module_deliverables d
              join mods md on md.id = d.module_id
             where d.user_id = mb.user_id and md.course_id = c.id and md.number = 20
               and d.status in ('enviado','revisado')) as final_delivered,
    (select d.status::text from public.module_deliverables d
       join mods md on md.id = d.module_id
      where d.user_id = mb.user_id and md.course_id = c.id and md.number = 20
      order by d.updated_at desc limit 1) as final_status,
    (select d.submitted_at from public.module_deliverables d
       join mods md on md.id = d.module_id
      where d.user_id = mb.user_id and md.course_id = c.id and md.number = 20
      order by d.updated_at desc limit 1) as final_submitted_at
  from members mb
  join public.enrollments e on e.user_id = mb.user_id
  join public.courses c on c.id = e.course_id
  where public.has_role(auth.uid(), 'admin')
  order by c.title, coalesce(mb.full_name, mb.display_name, mb.email);
$$;

revoke all on function public.admin_cohort_report(uuid) from public, anon;
grant execute on function public.admin_cohort_report(uuid) to authenticated;