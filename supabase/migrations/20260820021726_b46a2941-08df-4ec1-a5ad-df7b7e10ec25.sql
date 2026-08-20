
-- print: placeholder inerte vira texto de apoio visível
update public.module_pills p
set interaction_schema = p.interaction_schema
      || jsonb_build_object('campos', (
           select coalesce(jsonb_object_agg(k,
             case
               when jsonb_typeof(v) = 'object'
                    and k like 'print%'
                    and (v->>'placeholder') = 'cole o link da imagem ou anexa o print aqui'
                 then (v - 'placeholder') || jsonb_build_object('help', 'tira o print no celular ou no computador e anexa aqui. serve foto da tela mesmo.')
               else v
             end), '{}'::jsonb)
           from jsonb_each(p.interaction_schema->'campos') as kv(k, v)
         )),
    updated_at = now()
where jsonb_typeof(p.interaction_schema->'campos') = 'object'
  and exists (
    select 1 from jsonb_each(p.interaction_schema->'campos') as kv(k, v)
    where jsonb_typeof(v) = 'object' and k like 'print%'
      and (v->>'placeholder') = 'cole o link da imagem ou anexa o print aqui'
  );

-- enunciados longos: frase curta + linha de apoio
update public.module_pills
set interaction_schema = jsonb_set(
      jsonb_set(interaction_schema, '{campos,por_que,label}', '"o teste do tira a ia: o que piora na experiência sem ela?"'::jsonb),
      '{campos,por_que,help}', '"se não piora nada, essa também é uma resposta certa e ela vale."'::jsonb),
    updated_at = now()
where id = '8fe9a98a-e436-407e-a753-711df84a66d5';

update public.module_pills
set interaction_schema = jsonb_set(
      jsonb_set(interaction_schema, '{campos,pedido_a,label}', '"onde no fluxo você colocou a ia, e por quê"'::jsonb),
      '{campos,pedido_a,help}', '"se você concluiu que seu app não precisa de ia, escreve isso aqui e explica o porquê."'::jsonb),
    updated_at = now()
where id = '8fe9a98a-e436-407e-a753-711df84a66d5';

update public.module_pills
set interaction_schema = jsonb_set(
      jsonb_set(interaction_schema, '{campos,aprendi,label}', '"sua declaração de uso de ia, em 3 linhas"'::jsonb),
      '{campos,aprendi,help}', '"exemplo: a ia escreveu os textos da tela. eu decidi quais entravam. eu conferi os dados no site da escola."'::jsonb),
    updated_at = now()
where id = '6fce8d4a-b394-43f8-9323-b0d6baf34634';
