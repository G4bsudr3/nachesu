-- 1. Tabela invited_participants
create table public.invited_participants (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  whatsapp text,
  name text,
  nickname text,
  ja_fez_perestroika text,
  quais_cursos_perestroika text,
  instagram text,
  trabalho text,
  cidade text,
  ctx_maior_trava text,
  ctx_experiencia_lovable text,
  ctx_expectativa text,
  imported_at timestamptz not null default now(),
  event_slug text not null default 'chora-lovable-2026'
);

create or replace function public.validate_invited_participant()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.ctx_experiencia_lovable is not null
     and new.ctx_experiencia_lovable not in ('nunca-usei','ja-mexi','ja-publiquei','uso-diario') then
    raise exception 'ctx_experiencia_lovable inválido: %', new.ctx_experiencia_lovable;
  end if;
  new.email := lower(trim(new.email));
  return new;
end$$;

create trigger trg_validate_invited
  before insert or update on public.invited_participants
  for each row execute function public.validate_invited_participant();

alter table public.invited_participants enable row level security;

create policy "admin lê convidados"
  on public.invited_participants for select
  to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "admin gerencia convidados"
  on public.invited_participants for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 2. Novos campos em profiles
alter table public.profiles
  add column status text not null default 'active',
  add column approved_at timestamptz,
  add column approved_by_admin_id uuid;

create or replace function public.validate_profile_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status not in ('active','pending','archived') then
    raise exception 'status inválido: %', new.status;
  end if;
  return new;
end$$;

create trigger trg_validate_profile_status
  before insert or update on public.profiles
  for each row execute function public.validate_profile_status();

-- 3. Atualiza handle_new_user pra checar planilha
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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
  return new;
end$$;

-- garante que o trigger on auth.users existe
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. RPC admin_list_pending_profiles
create or replace function public.admin_list_pending_profiles()
returns table(user_id uuid, email text, display_name text, nickname text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.user_id, u.email::text, p.display_name, p.nickname, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.status = 'pending'
  and public.has_role(auth.uid(), 'admin');
$$;