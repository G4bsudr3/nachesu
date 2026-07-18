alter table public.enrollments disable trigger enrollments_single_active_check;

insert into public.enrollments (user_id, course_id, status)
select '401e3d19-4a20-479e-8c30-378f0ba84005', c.id, 'active'
from public.courses c
where c.slug in ('ia-na-pratica','economia-circular')
on conflict (user_id, course_id) do update set status='active';

alter table public.enrollments enable trigger enrollments_single_active_check;

insert into public.course_invites (course_id, email_normalized, claimed_at)
select c.id, 'tassiapmg@gmail.com', now()
from public.courses c
where c.slug in ('ia-na-pratica','economia-circular')
on conflict (course_id, email_normalized) do update set claimed_at = excluded.claimed_at;