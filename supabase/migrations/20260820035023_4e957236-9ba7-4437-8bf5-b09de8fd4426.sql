-- 1. módulos: tirar prefixos redundantes (o número já aparece no header)
update public.modules m
set title = regexp_replace(m.title, '^(encontro|módulo|missão)\s*[0-9]+\s*(·|:|-)\s*', '')
where m.title ~ '^(encontro|módulo|missão)\s*[0-9]+\s*(·|:|-)\s*';

-- 2. casing lowercase nos títulos de módulo e trilha
update public.modules set title = lower(title) where title <> lower(title) and title !~ '[A-Z]{2,}';
update public.trails set title = lower(title);

-- 3. vocabulário único nas pílulas da economia circular
with ec as (
  select p.id, p.kind, p.title, m.number
  from public.module_pills p
  join public.modules m on m.id = p.module_id
  join public.trails t on t.id = m.trail_id
  join public.courses c on c.id = t.course_id
  where c.slug = 'economia-circular'
)
update public.module_pills p
set title = case
  -- "missão N: x" / "missão de campo: x" -> "exercício: x"
  when ec.title ~ '^missão( de campo| [0-9]+)\s*[:·]\s*' then
    'exercício: ' || regexp_replace(ec.title, '^missão( de campo| [0-9]+)\s*[:·]\s*', '')
  -- fechamentos: "fechando a aula 2", "fechando a trilha 1", "fechando a primeira missão"
  when ec.title ~ '^fechando' then 'fechando o módulo ' || ec.number
  -- "checagem rápida" / "checagem · x"
  when ec.title = 'checagem rápida' then 'fechando o módulo ' || ec.number
  when ec.title ~ '^checagem\s*·\s*' then
    'fechando o módulo ' || ec.number || ' · ' || regexp_replace(ec.title, '^checagem\s*·\s*', '')
  when ec.title = 'missão 19 cumprida' then 'abertura do módulo 19'
  else ec.title
end
from ec
where ec.id = p.id and p.title <> case
  when ec.title ~ '^missão( de campo| [0-9]+)\s*[:·]\s*' then
    'exercício: ' || regexp_replace(ec.title, '^missão( de campo| [0-9]+)\s*[:·]\s*', '')
  when ec.title ~ '^fechando' then 'fechando o módulo ' || ec.number
  when ec.title = 'checagem rápida' then 'fechando o módulo ' || ec.number
  when ec.title ~ '^checagem\s*·\s*' then
    'fechando o módulo ' || ec.number || ' · ' || regexp_replace(ec.title, '^checagem\s*·\s*', '')
  when ec.title = 'missão 19 cumprida' then 'abertura do módulo 19'
  else ec.title
end;

-- 4. bônus padronizado com "·"
update public.module_pills set title = regexp_replace(title, '^bônus\s*:\s*', 'bônus · ') where title ~ '^bônus\s*:\s*';