-- enum dos 6 arquétipos
create type public.builder_archetype as enum (
  'visionario','artesao','experimentador','conector','pragmatico','narrador'
);

-- enum de status da geração
create type public.builder_card_status as enum ('gerando','pronta','erro');

create table public.builder_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  archetype public.builder_archetype,
  emoji text,
  full_text text,
  reasoning text,
  status public.builder_card_status not null default 'gerando',
  error_message text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  generated_at timestamptz
);

alter table public.builder_cards enable row level security;

-- só admin acessa
create policy "admin vê todas cartas"
on public.builder_cards for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "admin cria cartas"
on public.builder_cards for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "admin atualiza cartas"
on public.builder_cards for update to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "admin remove cartas"
on public.builder_cards for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

create trigger update_builder_cards_updated_at
before update on public.builder_cards
for each row execute function public.update_updated_at_column();

create index idx_builder_cards_user on public.builder_cards(user_id);
create index idx_builder_cards_status on public.builder_cards(status);