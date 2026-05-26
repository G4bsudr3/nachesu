
# Aproveitar NachesU 2.0 pra subir o curso ainda hoje

## o que o 2.0 tem que aqui não tem

O projeto **NachesU 2.0** é um rebuild paralelo (TanStack Start) que já matou três bloqueios que ainda travam este projeto:

1. **`content/ia-na-pratica.yaml` + `content/economia-circular.yaml`** — fonte de verdade dos **40 módulos** (4 trilhas × 5 módulos × 2 eletivas), cada um com 5 pílulas estruturadas: título, objetivo, kind, duração, `interaction_schema`. Mod 1 e parte da trilha 1 já com `body_md`; resto com placeholder `_(a preencher)_`.
2. **`scripts/seed-content.ts`** — seeder **idempotente** (upsert por `course.slug + module.number + pill.kind`, nunca rebaixa `published`, nunca apaga pílula órfã, não sobrescreve `body_md` real com placeholder). Roda quantas vezes quiser.
3. **`src/lib/content.schemas.ts`** — Zod schemas dos 4 `interaction_schema` ricos que este projeto já renderiza (`embed`, `curated`, `quiz`, `radar`), com `defaultInteractionForPillKind` e validação completa.
4. **Editor admin de conteúdo** (`admin.conteudo.tsx`, `admin.conteudo.$moduleId.tsx`, `admin.conteudo.pilula.$pillId.tsx` + componentes `ModuleForm`, `InteractionEditor`, `SortableList` com `@dnd-kit`) — permite frattz/Dudu autorarem direto na UI depois do seed.
5. **`docs/runbook.md`** — checklist operacional de lançamento (import CSV Sebrae, lotes de e-mail, rollback).

O que **não** vale portar agora: o framework (TanStack Start vs React Router/Vite daqui), as rotas inteiras (estrutura `_authenticated/_admin/` é outra), o auth (lá usa server functions). Risco alto pra ganho zero hoje.

---

## estratégia: 3 ondas, ~90 min total

### Onda A — Conteúdo no ar (40-50 min) · gate único pro lançamento

Objetivo: estudante consegue navegar 40 módulos com title/objective reais e 5 pílulas cada (algumas com body real, resto esqueleto honesto).

1. **Copiar yaml** — `content/ia-na-pratica.yaml` e `content/economia-circular.yaml` pro repo atual via `cross_project--copy_project_asset`. Zero edição: a estrutura `course → trails → modules → pills` já bate com o schema deste projeto (`courses`, `trails`, `modules`, `pills`).
2. **Portar `content.schemas.ts`** pra `src/lib/content.schemas.ts`. Já valida exatamente os 4 kinds que `ModuloPillList.tsx` dispatcha (`video_with_transcript` ≈ `embed`, `curated_content_with_questions` ≈ `curated`, `quiz`, `radar_form` ≈ `radar`).
   - Ajuste único: mapear `kind` do schema 2.0 (`embed`/`curated`/`quiz`/`radar`) → `type` que o dispatcher atual espera (`video_with_transcript`/`curated_content_with_questions`/`quiz`/`radar_form`). Layer fina de tradução no seeder, sem mexer no renderer.
3. **Portar `scripts/seed-content.ts`** pra `scripts/seed-content.ts` daqui. Adaptar duas coisas:
   - nome de tabela: 2.0 usa `module_pills`, aqui é `pills` (confirmar lendo `src/integrations/supabase/types.ts` antes).
   - tradução `interaction_schema.kind` → `interaction_schema.type` (item 2 acima).
   - usar `SUPABASE_SERVICE_ROLE_KEY` via env (já configurado em outros scripts do projeto).
4. **Rodar seed** pra os 2 cursos. Idempotente, então pode rodar de novo depois de qualquer ajuste no yaml.
5. **Smoke test manual** (5 min): logar como aluno fictício, abrir `/app/modulo/1` de cada eletiva, confirmar que aparecem 5 pílulas, que o dispatcher renderiza cada kind corretamente, e que módulos 2-20 abrem com esqueleto.

**Checkpoint humano:** revisar 1 módulo de cada eletiva no preview antes de continuar. Se quebrar, ajusta o seeder, roda de novo.

### Onda B — Editor admin pra continuar autorando (30-40 min) · opcional pra hoje

Necessário só se frattz/Dudu vão escrever `body_md` real direto na UI ao invés de editar o yaml. Se a Onda A já basta (autoria via yaml + reseed), pula.

6. **Portar 3 componentes admin** do 2.0:
   - `src/components/admin/SortableList.tsx` (precisa `@dnd-kit/core` + `@dnd-kit/sortable` — confirmar se já estão instaladas; se não, `bun add`).
   - `src/components/admin/ModuleForm.tsx` (formulário de metadados do módulo).
   - `src/components/admin/InteractionEditor.tsx` (editor estruturado por kind — o coração).
7. **Criar 3 páginas admin** equivalentes (em React Router daqui, não TanStack):
   - `src/pages/AdminConteudo.tsx` — seletor de curso + lista de módulos com drag-to-reorder.
   - `src/pages/AdminConteudoModulo.tsx` — detalhe do módulo + lista de pílulas.
   - `src/pages/AdminConteudoPilula.tsx` — editor de uma pílula com preview drawer que renderiza o componente real.
8. **Plugar no `AdminRoute`** atual + adicionar card "conteúdo" no painel `/admin` (perto de "eletivas" e "trilha").
9. **Mutations server-side** — porta `src/lib/content.functions.ts` do 2.0 como hooks `useContentMutations` chamando `supabase-js` direto daqui (não temos server functions, e RLS já protege).

### Onda C — Operação (10 min) · faz junto com lançamento

10. **Copiar `docs/runbook.md`** do 2.0 pra `docs/runbook.md` daqui. Checklist de import CSV Sebrae, regra de lote 50 e-mails/min, gatilhos de rollback, plano B se atrasar. Vira referência viva da semana de lançamento.

---

## o que NÃO portar (decisão explícita)

- **Rotas TanStack Start** (`_authenticated/_admin/*`) — incompatível com React Router daqui. Reimplementar como `src/pages/Admin*` nativo.
- **Auth helpers do 2.0** (`auth-context.tsx`, `requireSupabaseAuth`) — daqui já tem `AuthContext` + `AdminRoute` funcionando.
- **`components/pills/` do 2.0** — daqui já tem 5 componentes ricos equivalentes em `src/components/eletiva/pills/` (PillAbertura, PillConteudoCurado, PillQuiz, PillRadar, PillBonus). Manter os daqui, só garantir que o `interaction_schema.type` seedado bate.
- **`components/naches/`** — provavelmente brand/layout daquele projeto; daqui já tem `<NachesULogo />`, `<EletivaFooter />`, `<EletivaSymbol />` consolidados.
- **Editor de `module_releases`** — o gate atual é "sem row = aberto", então 40 módulos seedados já ficam visíveis. Cronograma semanal vira tarefa pós-lançamento (item da Onda 3 do plan.md original).

---

## detalhes técnicos

- **Diferença de schema crítica:** 2.0 chama tabela de pílulas de `module_pills`, aqui é `pills`. Confirmar via `code--view src/integrations/supabase/types.ts` antes de rodar o seeder. Resto (`courses`, `trails`, `modules`) bate.
- **Tradução de `interaction_schema`:** lookup table no seeder:
  ```ts
  const kindMap = {
    embed: "video_with_transcript",
    curated: "curated_content_with_questions",
    quiz: "quiz",
    radar: "radar_form",
  };
  ```
- **Idempotência de body_md:** seeder respeita `_(a preencher)_` como placeholder — nunca sobrescreve texto real já no banco. Permite frattz/Dudu editarem direto pelo admin (Onda B) sem perder progresso ao rodar seed de novo.
- **Comando de execução:** `bun scripts/seed-content.ts content/ia-na-pratica.yaml` e idem pra economia-circular. Env vars: `SUPABASE_URL` (já em `.env`) e `SUPABASE_SERVICE_ROLE_KEY` (precisa adicionar via tool de secrets — usar só localmente, nunca no client).
- **Tutor IA** já está funcional aqui (item P0.2 da Onda 1 corrigiu o FAB). Não precisa mexer.

---

## ordem de aprovação

Topo de prioridade: **Onda A** sozinha já destrava aluno hoje. Confirma que executo direto:
1. copiar 2 yaml + schemas
2. adaptar e rodar seeder
3. smoke test
4. te chamo pra revisar antes de Onda B/C

Se quiser que Onda B (editor admin) seja parte do mesmo push, falar agora — ainda cabe nas próximas ~2h.
