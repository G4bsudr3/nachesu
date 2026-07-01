# plano: validação de qualidade + costura editorial m1-m2-m3

## 1. validação de qualidade ao publicar (backend + UI admin)

**objetivo:** bloquear (e sinalizar) publicação de módulo com pílulas vazias ou rasas, no mesmo padrão do `assert_module_in_scope` que já existe.

### regras de qualidade por pílula
uma pílula é considerada "incompleta" se satisfaz qualquer:
- `title` vazio ou nulo
- `body_md` vazio E `interaction_schema` nulo
- `body_md` < 30 chars E `interaction_schema` nulo (corpo raso sem estrutura)
- para kinds `pilula_a`/`pilula_b`/`pilula_c`: `interaction_schema` presente mas sem `aprofundamento.md` nem `video.url` (esqueleto vazio)
- para kind `exercicio_pbl`: `interaction_schema` presente mas sem `passos`, `campos` nem `prompts`
- para kind `registro`: `interaction_schema` presente mas sem `templates`, `commitments`, `campos` nem `reflexao`

adicionalmente, o próprio módulo é sinalizado se tem < 4 pílulas.

### migration (nova)
- `public.pill_quality_issues(mp module_pills) → text[]` — retorna lista de problemas de 1 pílula (função stable, pura)
- `public.module_quality_check(_module_id uuid) → table(pill_id, pill_title, pill_kind, issue text)` — security definer, admin only, usado pela UI
- `public.module_quality_check_course(_course_id uuid) → table(module_id, module_number, module_title, pill_id, pill_title, pill_kind, issue text)` — security definer, admin only
- `public.assert_module_quality(_module_id uuid)` — raise exception se houver problemas, mensagem clara: "Publicação bloqueada: módulo tem pílulas incompletas: …"
- novo trigger `trg_module_publish_quality_check` em `modules` (BEFORE UPDATE OF published), roda quando `NEW.published=true AND OLD.published IS DISTINCT FROM true`
- também roda em `module_releases` via extensão de `trg_release_scope_check` (ou trigger paralelo `trg_release_quality_check`)

### UI admin
- estender `src/features/admin/AdminEletivaReview.tsx`:
  - adicionar bloco "verificação de qualidade" abaixo do bloco de escopo, seguindo o mesmo padrão visual (ícone check verde / alert vermelho, botão rever, lista de issues agrupada por módulo)
  - usar novo hook interno com `supabase.rpc('module_quality_check_course', { _course_id })`
  - badge "N pílulas incompletas" no header de cada `AccordionItem` do módulo (paralelo ao "N fora" que já existe)
  - dentro de cada pílula, se estiver na lista, mostrar linha vermelha "incompleta: {issue}"

## 2. fonte verificável da estat stanford HAI no módulo 3

**estado atual:** `gancho.destaque_numero: "27%"` + `destaque_legenda: "das respostas de ias generativas contêm pelo menos uma informação falsa (stanford hai, 2024)"` — sem link.

**mudança:** update no `interaction_schema` da pílula `pilula_a` do módulo 3, adicionar:
- `gancho.destaque_source: { label: "AI Index Report 2024, capítulo 3", url: "https://aiindex.stanford.edu/report/" }`

e no renderer (componente que renderiza `gancho`), incluir o link abaixo da legenda quando `destaque_source` existir. verifico primeiro se já existe suporte no componente atual (`src/components/eletiva/pills/`) — se não, adiciono renderização condicional simples de `<a>` com o label, `target=_blank`, `rel=noreferrer`, seguindo o tom (lowercase, underline sutil).

## 3. ponte explícita m1 → m2 antes de introduzir o corf

**estado atual:** m1 pílula c já usou informalmente "contexto, objetivo, formato" no exemplo do trabalho de história ("trabalho de história sobre revolução industrial pra apresentar pro 9º ano em 10 minutos com foco em consequências sociais"), mas o m2 pílula_b apresenta corf sem citar essa continuidade.

**mudança:** update no `interaction_schema.gancho.md` da pílula `pilula_b` do módulo 2 (título "a estrutura que muda tudo: corf"). prepend do parágrafo de ponte:

> lembra do exemplo do módulo 1? "me ajuda a fazer um trabalho de história sobre revolução industrial pra apresentar pro 9º ano em 10 minutos com foco em consequências sociais". sem perceber, você já usou 3 dos 4 elementos que fazem um prompt funcionar: contexto, objetivo, formato. agora a gente dá nome pra estrutura completa (com o 4º elemento) e transforma isso em habilidade.

o resto do gancho (analogia do pedido pro amigo) segue igual.

## 4. preencher body_md vazios dos módulos 2 e 3

**estado atual:** m1 tem `body_md` com sumário curto (1 linha) em cada pílula. m2 e m3 estão com `body_md = ''` — inconsistência técnica que aparece em `admin_module_pills`, no `AdminEletivaReview` (`pre` com "(corpo vazio)") e em qualquer fallback.

**mudança:** update via insert tool com sumários curtos (1 linha, tom frattz) baseados em título/objetivo já existentes:

| módulo | pílula | body_md |
|---|---|---|
| 2 | pilula_a | prompt engineering não é técnico, é saber conversar. |
| 2 | pilula_b | 4 letras que separam pedido aleatório de pedido que funciona: corf. |
| 2 | pilula_c | mesmo objetivo, 3 níveis de prompt: veja a diferença na prática. |
| 2 | exercicio_pbl | reescreva 3 prompts ruins usando corf e compare o antes/depois na ia. |
| 2 | registro | monte seu arsenal: 3 templates de prompt prontos pra reusar. |
| 3 | pilula_a | por que ia responde com tanta confiança mesmo quando tá inventando. |
| 3 | pilula_b | método de 2 minutos pra checar qualquer resposta antes de confiar. |
| 3 | pilula_c | a ia herda os vieses dos dados. saber onde olhar é seu trabalho. |
| 3 | exercicio_pbl | caça à alucinação: encontre o erro em uma resposta que parece impecável. |
| 3 | registro | assine seu pacto pessoal com checagem crítica pra levar pro resto do curso. |

## ordem de execução

1. migration (funções + trigger de qualidade)
2. insert (updates de `body_md` + patch dos `interaction_schema` do m2/pb e m3/pa)
3. edit UI (`AdminEletivaReview.tsx` com bloco de qualidade)
4. edit UI (renderer de `gancho` pra mostrar `destaque_source` se presente) — só se o componente atual não suportar
5. verificar: rodar `module_quality_check_course` pelas duas eletivas, conferir que m1/m2/m3 saem limpos e m4/m5 aparecem sinalizados

## fora de escopo

- reescrita de m4 e m5 (é o outro caminho, não incluído aqui)
- análise da eletiva de economia circular
- mudanças no fluxo de estudante (nada visível pro aluno muda, exceto o link da fonte no m3 e a linha de ponte no gancho do m2)
- alterações no design system ou tokens