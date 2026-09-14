create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);

grant select, insert, update, delete on public.cohorts to authenticated;
grant all on public.cohorts to service_role;
grant select, insert, update, delete on public.cohort_members to authenticated;
grant all on public.cohort_members to service_role;

alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;

drop policy if exists "admins manage cohorts" on public.cohorts;
create policy "admins manage cohorts" on public.cohorts
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins manage cohort members" on public.cohort_members;
create policy "admins manage cohort members" on public.cohort_members
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists cohort_members_cohort_idx on public.cohort_members(cohort_id);

-- lista de turmas com contagens
create or replace function public.admin_cohorts()
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  starts_on date,
  ends_on date,
  student_count bigint,
  courses text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.slug, c.description, c.starts_on, c.ends_on,
    (select count(*) from public.cohort_members m where m.cohort_id = c.id) as student_count,
    coalesce((
      select array_agg(distinct co.title order by co.title)
      from public.cohort_members m
      join public.enrollments e on e.user_id = m.user_id
      join public.courses co on co.id = e.course_id
      where m.cohort_id = c.id
    ), '{}'::text[]) as courses
  from public.cohorts c
  where public.has_role(auth.uid(), 'admin')
  order by coalesce(c.starts_on, c.created_at::date) desc, c.name;
$$;

-- estudantes de uma turma com as eletivas que fizeram
create or replace function public.admin_cohort_members(_cohort_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text,
  full_name text,
  turma text,
  courses text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.user_id,
    u.email::text,
    p.display_name,
    r.full_name,
    r.turma,
    coalesce((
      select array_agg(distinct co.title order by co.title)
      from public.enrollments e
      join public.courses co on co.id = e.course_id
      where e.user_id = m.user_id
    ), '{}'::text[]) as courses
  from public.cohort_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.user_id = m.user_id
  left join public.student_roster r on r.email_normalized = lower(u.email)
  where m.cohort_id = _cohort_id
    and public.has_role(auth.uid(), 'admin')
  order by coalesce(r.full_name, p.display_name, u.email::text);
$$;

revoke all on function public.admin_cohorts() from public, anon;
revoke all on function public.admin_cohort_members(uuid) from public, anon;
grant execute on function public.admin_cohorts() to authenticated;
grant execute on function public.admin_cohort_members(uuid) to authenticated;

-- turma do semestre atual com todo mundo matriculado
insert into public.cohorts (name, slug, description, starts_on, ends_on)
values ('turma 2026.1', 'turma-2026-1', 'primeiro semestre de eletivas naches na escola sebrae bh', date '2026-03-02', date '2026-12-18')
on conflict (slug) do nothing;

insert into public.cohort_members (cohort_id, user_id)
select c.id, e.user_id
from public.cohorts c
cross join (select distinct user_id from public.enrollments) e
where c.slug = 'turma-2026-1'
on conflict do nothing;