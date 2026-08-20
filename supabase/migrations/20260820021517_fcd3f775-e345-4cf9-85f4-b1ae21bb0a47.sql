
with ph(pid, qid, phv) as (
  values
  ('834b37ea-c5f9-49f2-bcd0-e2a2ec3c101a'::uuid,'p3','ex: o que mais me incomoda é... porque toda semana eu...'),
  ('69cee3d0-7bf9-4180-aed3-e02fd85cbe63','q1-ciclos','ex: técnico: a lata de refrigerante que volta pra indústria virar lata de novo. biológico: a casca da fruta que vira adubo na horta.'),
  ('69cee3d0-7bf9-4180-aed3-e02fd85cbe63','q2-atores','ex: as cooperativas de catadores querem... já o sindicato da indústria têxtil quer... o choque aparece quando...'),
  ('b9bb4030-8f2d-4d55-9faf-f3191e138cd3','q3-marca','ex: acho que a marca X é linear maquiada porque ela troca a embalagem mas o produto continua...'),
  ('b9bb4030-8f2d-4d55-9faf-f3191e138cd3','q1-traducao','ex: quer dizer que o negócio depende de... se isso acabar, o negócio...'),
  ('120f7a62-21a8-4d4b-8c5a-f998ebda4d94','p3-radar-regenerativo','ex: escolho o problema... porque além de parar o desperdício ele ainda devolve...'),
  ('b7929902-d136-4c14-aa56-85a4ff9e768d','resistencia','ex: quem mais resiste é... porque perde... pra lidar, eu ia começar mostrando...'),
  ('cd034752-0efe-41bd-af17-1155a99e2a19','quem-ganha','ex: quem ganha é... porque hoje esse jeito economiza tempo ou dinheiro pra...'),
  ('ae4851b2-a682-46ae-a92a-9be627ba3a73','q2-anti-hipotese','ex: minha hipótese é... a evidência que destruiria ela seria... e eu mediria isso assim...'),
  ('817e2f7f-a2d7-4840-b854-b957b0eb8a81','q3-descoberta','ex: eu achava que... mas quando fui ver de perto, descobri que...'),
  ('738e11ba-7518-49ce-891c-3ac314ce6398','q2-hmw-eu','ex: como podemos reduzir o desperdício de comida no refeitório da escola até o fim do semestre, sem aumentar o custo da refeição?'),
  ('83c01692-0ad7-4f7f-9570-3fec35da6763','q3-expectativa','ex: espero descobrir que eu consigo... espero perder o medo de... espero aprender a...'),
  ('b6455c33-7d9d-4058-a738-f7edc854d1f6','q3-vazamento-dia','ex: todo dia sobra... e vai direto pro lixo, mesmo dando pra...'),
  ('b6455c33-7d9d-4058-a738-f7edc854d1f6','q2-meu-ciclo','ex: é mais ciclo técnico, porque o material principal é... e ele precisa voltar pra...'),
  ('db1ddc64-ace1-4fd5-85eb-02fe96ee617d','q3-mais-valioso','ex: o mais valioso é... porque ele se repete toda semana e mexe com...'),
  ('68c6b739-7012-4e1a-b788-a1038081c30f','q2-invisivel','ex: só dá pra enxergar indo lá: ... porque de fora parece que...'),
  ('68c6b739-7012-4e1a-b788-a1038081c30f','q3-cliente-pagante','ex: a cantina terceirizada da escola, porque ela paga hoje por...'),
  ('7422d15d-77dd-4599-ac83-43a0eafd01cc','q3-mais-promissora','ex: a mais promissora é... porque dá pra testar rápido e já tem gente reclamando disso'),
  ('46cdbbf2-d171-497b-93ee-df40c45d0dc3','q3-encaixe','ex: encaixa melhor em... porque a minha ideia age antes do resíduo existir...'),
  ('7b53b866-d2b6-47ae-a490-5af161119ec9','q3-so-um','ex: escolheria... porque sem ele o meu projeto perde o sentido...'),
  ('22308fd9-70af-4deb-aaba-0bfb96d01c64','q2-se-desse-certo','ex: o solo da horta da escola ficaria mais fértil e mais gente comeria comida plantada ali'),
  ('0216d3c3-5083-43e1-9c3e-05be511a2d25','q3-manchete','ex: eu diria que hoje o bairro... e que isso começou quando a gente...'),
  ('f36808ee-c910-42bc-96e8-482fca9416e5','q3-dificil','ex: o mais difícil é... porque tem poder de barrar e pouco interesse no tema'),
  ('90272714-0d20-4d92-b6d7-2cefb04af700','q2-parceiros-bh','ex: 1. asmare, ganharia material separado na fonte
2. ...
3. ...'),
  ('79d8a5a5-58b3-4fe1-8188-3e4c721afdb7','q3-4semanas','ex: escolheria a ideia... porque dá pra testar com o que eu já tenho na escola'),
  ('34bf47e7-b58c-40b0-ba70-ed909789c799','q3-plano-b','ex: apostaria na b, porque ela depende menos de...'),
  ('7ad89002-dafd-4248-ba2b-a3833b2c1274','q3-agora','ex: vem agora porque hoje existe... e há 10 anos isso custava caro ou nem existia'),
  ('2839af05-7e67-4ccc-84ef-095f4f879b02','q3-reescreve','ex: a gente faz x pra y, sem z'),
  ('358d4891-9567-4a07-a9c6-3504138fc837','q3-fracasso','ex: a razão mais provável é... porque o custo de... é maior do que alguém aceitaria pagar'),
  ('a43ce1d7-8be2-41de-9f9f-84b43eb34920','q3-se-falsa','ex: se for falsa, o projeto perde... e eu teria que mudar...'),
  ('cd4ed640-50fc-43e4-8996-a4ba685cca08','q3-mais-riscada','ex: a mais arriscada é... porque eu nunca vi ninguém fazer isso de verdade'),
  ('4ccf9504-6d79-4e6a-8382-998ee3a67d56','q3-fracasso','ex: ia me ensinar que... e isso me pouparia semanas construindo a coisa errada'),
  ('0a5de02e-a9da-4d71-8974-c3d2d867ed5d','p3-proximo','ex: o próximo teste seria... com... pra descobrir se...')
)
update public.module_pills p
set interaction_schema = jsonb_set(
      p.interaction_schema,
      '{questions}',
      (
        select coalesce(jsonb_agg(
          case
            when m.phv is not null and coalesce(e->>'placeholder','') = ''
              then e || jsonb_build_object('placeholder', m.phv)
            else e
          end order by ord), '[]'::jsonb)
        from jsonb_array_elements(p.interaction_schema->'questions') with ordinality t(e, ord)
        left join ph m on m.pid = p.id and m.qid = e->>'id'
      )
    ),
    updated_at = now()
where p.id in (select pid from ph)
  and jsonb_typeof(p.interaction_schema->'questions') = 'array';

update public.module_pills p
set interaction_schema = jsonb_set(
      p.interaction_schema,
      '{questions}',
      (
        select coalesce(jsonb_agg(
          case
            when e->>'type' = 'multi_choice'
                 and (e->>'label') not ilike '%todas%'
                 and (e->>'label') not ilike '%mais de uma%'
              then e || jsonb_build_object(
                'label',
                rtrim(e->>'label', ': ')
                || case
                     when jsonb_array_length(coalesce(e->'correct','[]'::jsonb)) > 0
                       then ' (marque todas que se aplicam, são ' || jsonb_array_length(e->'correct') || ')'
                     else ' (pode marcar mais de uma)'
                   end
                || ':'
              )
            else e
          end order by ord), '[]'::jsonb)
        from jsonb_array_elements(p.interaction_schema->'questions') with ordinality t(e, ord)
      )
    ),
    updated_at = now()
where jsonb_typeof(p.interaction_schema->'questions') = 'array'
  and exists (
    select 1 from jsonb_array_elements(p.interaction_schema->'questions') e
    where e->>'type' = 'multi_choice'
      and (e->>'label') not ilike '%todas%'
      and (e->>'label') not ilike '%mais de uma%'
  );

update public.module_pills p
set interaction_schema = p.interaction_schema
      || jsonb_build_object('campos', (
           select coalesce(jsonb_object_agg(k,
             case
               when jsonb_typeof(v) = 'object'
                    and (v->>'placeholder') is null
                    and (v->'options') is null
                    and k like 'print%'
                 then v || jsonb_build_object('placeholder', 'cole o link da imagem ou anexa o print aqui')
               else v
             end), '{}'::jsonb)
           from jsonb_each(p.interaction_schema->'campos') as kv(k, v)
         )),
    updated_at = now()
where jsonb_typeof(p.interaction_schema->'campos') = 'object'
  and exists (
    select 1 from jsonb_each(p.interaction_schema->'campos') as kv(k, v)
    where jsonb_typeof(v) = 'object'
      and (v->>'placeholder') is null
      and (v->'options') is null
      and k like 'print%'
  );

update public.module_pills p
set interaction_schema = jsonb_set(
      p.interaction_schema,
      '{cards}',
      (
        select coalesce(jsonb_agg(
          case
            when (e->>'url') ilike '%search_query%' or (e->>'url') ilike '%/results?%'
              then e || jsonb_build_object(
                     'source', 'busca no youtube (o link abre a lista de resultados)',
                     'description', coalesce(e->>'description','')
                       || case when coalesce(e->>'description','') = '' then '' else ' ' end
                       || 'esse link abre uma busca, não um vídeo único. escolhe o primeiro resultado em português e assiste com o objetivo desta pílula em mente.'
                   )
            else e
          end order by ord), '[]'::jsonb)
        from jsonb_array_elements(p.interaction_schema->'cards') with ordinality t(e, ord)
      )
    ),
    updated_at = now()
where jsonb_typeof(p.interaction_schema->'cards') = 'array'
  and exists (
    select 1 from jsonb_array_elements(p.interaction_schema->'cards') e
    where (e->>'url') ilike '%search_query%' or (e->>'url') ilike '%/results?%'
  );
