## o que eu entendi

- tirar o esquema de liberação semanal automática
- deixar exatamente 3 módulos visíveis pro estudante: os módulos 1, 2 e 3 da **trilha 1** de cada eletiva (Fundamentos & IA em IA na Prática, Enxergar em Economia Circular)
- o resto fica oculto até você decidir publicar

## causa do bug atual

A migration de hoje (`20260608095201_…`) adicionou na policy de `modules` um `EXISTS (SELECT 1 FROM module_releases ...)`. A policy de `module_releases` já fazia o caminho inverso (`EXISTS FROM modules JOIN trails JOIN enrollments`). Isso criou dependência circular entre as duas RLS e o resultado pro estudante é vazio. Admin (que entra pelo ramo `has_role admin`) continua vendo tudo, por isso passou batido.

Somado a isso, `available_from` tem datas futuras em quase tudo, então mesmo se a RLS funcionasse a maior parte ficaria escondida.

## plano

### 1. migration — tirar o gate de liberação semanal da RLS

Reverter a policy de `modules` pra versão simples: estudante vê módulo se está matriculado no curso da trilha **e** o módulo está `published = true`. Sem `module_releases`, sem janela `available_from`. Mesma simplificação na policy de `module_pills` (depende só de `modules.published`).

A tabela `module_releases` continua existindo (histórico/audit), só deixa de ser gate. O trigger `log_module_publish` que insere em `module_releases` quando alguém publica módulo pode continuar — não atrapalha.

```sql
DROP POLICY IF EXISTS "aluno vê módulos liberados se matriculado" ON public.modules;
CREATE POLICY "aluno vê módulos publicados se matriculado"
ON public.modules FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.trails t
      JOIN public.enrollments e ON e.course_id = t.course_id
      WHERE t.id = modules.trail_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "aluno vê pílulas de módulos liberados" ON public.module_pills;
CREATE POLICY "aluno vê pílulas publicadas de módulos visíveis"
ON public.module_pills FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_pills.module_id AND m.published = true
    )
  )
);
```

### 2. data update — deixar só 3 módulos publicados por curso

Pra cada curso, manter `published = true` apenas nos 3 primeiros módulos da trilha de `order_index = 1`; despublicar (`published = false`) o resto e zerar `available_from` em todos (não precisa mais dessa janela).

```sql
-- zera janela em tudo
UPDATE public.modules SET available_from = NULL;

-- despublica geral
UPDATE public.modules SET published = false;

-- republica só os 3 primeiros da trilha 1 de cada curso
UPDATE public.modules m
   SET published = true
  FROM public.trails t
 WHERE m.trail_id = t.id
   AND t.order_index = 1
   AND m.number <= 3;
```

> O trigger `trg_module_publish_scope_check` roda no UPDATE pra checar escopo das pílulas. Os 6 módulos publicados (3+3) já estavam publicados antes e passaram, então o re-publish passa também. Se travar, eu reporto e a gente decide pílula a pílula.

### 3. validação pós-migration

Rodar como leitura (`read_query`) simulando contagem geral: esperado **3 módulos publicados por curso**, todos na trilha 1, `available_from IS NULL` em todos. E confirmar visualmente no preview que o mapa mostra "0/3" na trilha 1 e "módulos chegando em breve" nas demais trilhas.

## fora de escopo

- não vou apagar dados de `module_releases` nem do trigger `log_module_publish` — fica como histórico interno
- não vou mexer em código (`useEletivaProgress`, `TrilhaColumn`, etc.). O hook já trata `published=false` como "trilha vazia" sem regredir nada
- não vou criar UI nova de "publicar manualmente": o admin já controla via `published` (e quando quiser liberar o módulo 4, basta marcar publicado)

## confirmações antes de implementar

1. Os 3 módulos liberados são, pra cada curso, **os módulos 1, 2 e 3 da trilha 1**, certo? (em vez de, por exemplo, os 3 primeiros de cada trilha)
2. Posso tirar `available_from` de tudo (zerar)? Você não vai querer ressuscitar a janela depois.
