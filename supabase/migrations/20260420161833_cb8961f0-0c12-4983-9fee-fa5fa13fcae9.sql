-- backup defensivo: salva qualquer rascunho existente em jsonb antes de dropar
alter table public.fbi_responses add column if not exists legacy_data jsonb;
update public.fbi_responses set legacy_data = to_jsonb(fbi_responses.*) where submitted = false;

-- drop colunas antigas
alter table public.fbi_responses
  drop column if exists nome_completo,
  drop column if exists pronome,
  drop column if exists ocupacao,
  drop column if exists empresa_ou_projeto,
  drop column if exists link_principal,
  drop column if exists ja_usou_lovable,
  drop column if exists ja_codou,
  drop column if exists nivel_tech,
  drop column if exists o_que_quer_construir,
  drop column if exists por_que,
  drop column if exists expectativa_imersao,
  drop column if exists como_chegou,
  drop column if exists algo_mais;

-- adiciona as 18 perguntas novas (cidade já existe)
alter table public.fbi_responses
  add column if not exists nome text,
  add column if not exists nickname text,
  add column if not exists whatsapp text,
  add column if not exists idade integer,
  add column if not exists instagram text,
  add column if not exists linkedin text,
  add column if not exists trabalho text,
  add column if not exists ja_fez_perestroika text,
  add column if not exists quais_cursos_perestroika text,
  add column if not exists restricao_alimentar text,
  add column if not exists locomocao text,
  add column if not exists expectativa_chora text,
  add column if not exists maior_desafio text,
  add column if not exists experiencia_lovable text,
  add column if not exists ultima_criacao_orgulho text,
  add column if not exists ideia_gaveta text,
  add column if not exists perde_nocao_tempo text,
  add column if not exists algo_mais text;

-- validação de experiencia_lovable + idade
create or replace function public.validate_fbi_response()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.experiencia_lovable is not null
     and new.experiencia_lovable not in ('nunca-usei','ja-mexi','ja-publiquei','uso-diario') then
    raise exception 'experiencia_lovable inválido: %', new.experiencia_lovable;
  end if;
  if new.idade is not null and (new.idade < 14 or new.idade > 99) then
    raise exception 'idade fora do range esperado: %', new.idade;
  end if;
  return new;
end$$;

drop trigger if exists trg_validate_fbi_response on public.fbi_responses;
create trigger trg_validate_fbi_response
  before insert or update on public.fbi_responses
  for each row execute function public.validate_fbi_response();

-- trigger pra updated_at (caso ainda não exista)
drop trigger if exists trg_fbi_responses_updated_at on public.fbi_responses;
create trigger trg_fbi_responses_updated_at
  before update on public.fbi_responses
  for each row execute function public.update_updated_at_column();