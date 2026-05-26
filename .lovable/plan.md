# Plano: NachesU funcional ponta-a-ponta

Premissa nova: **sem trava de semana**. Admin cria módulo/pílula quando quiser e tem um toggle "publicar pro estudante". Tudo que está publicado fica visível imediatamente. Estudante avança no ritmo dele.

## Estado atual (confirmado por inspeção)
- 2 cursos seedados (`ia-na-pratica`, `economia-circular`), cada um com 4 trilhas × 5 módulos × 5 pílulas = 40 módulos, 200 pílulas
- Conteúdo (`body_md`) em quase tudo, mas `interaction_schema` quase vazio (só `exercicio_pbl` tem). 4 em 5 pílulas caem em comportamento passivo
- `module_releases` controla visibilidade: hoje só mód 1-3 estão liberados
- Sem editor visual: enriquecer pílula exige SQL
- NachesU 2.0 (projeto irmão) tem editor pronto e schemas Zod das 4 interações

## Onda A — Publicação por toggle (substitui release por semana)

Trocar o modelo "liberado quando entra em `module_releases`" por **`modules.published` (booleano)**, sem perder o schema atual.

1. Migration: adicionar `modules.published boolean default false` e `pills.published boolean default false`
2. Backfill: marcar como `published=true` todo módulo que já está em `module_releases` hoje (mantém quem já tinha acesso)
3. RLS de leitura do estudante: passa a ler `modules.published=true` em vez de checar `module_releases`. Admin continua vendo tudo
4. `module_releases` fica como tabela legada (histórico de quando foi liberado), não bloqueia mais
5. Frontend (`/app`, `/app/eletiva/:slug`, listagem de trilha): consome `published`. CTA "próximo módulo" vai pro primeiro módulo publicado não concluído

Resultado: admin liga o toggle, estudante vê na hora.

## Onda B — Editor de conteúdo no admin

Portar do NachesU 2.0 (adaptado pro schema atual: `pills`, `interaction_schema.type`).

1. `src/lib/content.schemas.ts` — Zod das 4 interações (`embed`, `curated`, `quiz`, `radar`) + `defaultInteractionForPillKind`
2. Páginas novas em `/admin/conteudo`:
   - lista de cursos → trilhas → módulos
   - editor de módulo: título, ordem, **toggle publicar**, lista de pílulas drag-and-drop (`@dnd-kit`)
   - editor de pílula: título, objetivo, tipo, duração, `body_md` (markdown), **toggle publicar**, `InteractionEditor` específico do tipo
   - botão "criar novo módulo" e "criar nova pílula" em qualquer trilha, qualquer hora
3. Mutations server-side via Supabase client com RLS de admin
4. Plugar atrás do `AdminRoute` existente, item no menu admin

## Onda C — Renderizadores das 4 interações no estudante

Hoje só `exercicio_pbl` funciona bem. Garantir que as 4 rendem:

- `embed`: vídeo/link externo com aspect ratio + fallback
- `curated`: lista de recursos curados com tag, descrição, link
- `quiz`: múltipla escolha com feedback imediato + registro em `module_progress`
- `radar`: auto-avaliação em eixos com visualização

Componentes podem reaproveitar o que tem em `src/components/pills/` + completar o que falta.

## Onda D — Smoke test + runbook

1. Criar 1 módulo novo pelo admin do zero, publicar, ver aparecer no `/app` de um estudante de teste
2. Editar `interaction_schema` de uma pílula existente, validar que renderiza
3. Despublicar, validar que some
4. Copiar `docs/runbook.md` do 2.0 (checklist de import CSV Sebrae, envio de magic link em lote, rollback)

## Detalhes técnicos

- Migração é aditiva: `published` default `false` + backfill imediato. Zero downtime
- RLS dos estudantes: trocar política de SELECT em `modules` e `pills` pra `published = true OR has_role(auth.uid(), 'admin')`
- `module_releases` continua existindo (não dropar) — vira log de "quando foi liberado a primeira vez"
- Editor admin não toca em conteúdo que respeita placeholder `_(a preencher)_` (não tem mais seeder, mas mantém convenção)
- Tutor IA (joão-de-barro) continua atrás de `useEletivaExtras` igual hoje, fora do escopo

## Fora de escopo (não nessa rodada)
- Vocabulário Chŏra legado (FBI, carta, missões) — segue atrás da flag
- Sistema de gamificação extra
- Notificação por email quando novo módulo publica (pode entrar numa onda E depois)

## Ordem de execução
A (toggle publicar) → C (renderizadores das 4 interações) → B (editor admin) → D (smoke + runbook).

Justificativa da ordem: A destrava o controle, C garante que o que admin publica realmente funciona pro estudante, B dá a ferramenta de criação, D fecha. Se eu fizesse B antes de C, admin editaria interações que não renderizam.
