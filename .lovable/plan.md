# Módulo 4 (ia-na-pratica) — upgrade editorial

Só o módulo 4 da trilha 1, curso `ia-na-pratica`. UPDATE nas 5 pílulas existentes (IDs preservados, `kind` e `order_index` intactos). Zero mudança em `published`, `module_releases` ou progresso de estudante.

## Pílulas afetadas

| ord | kind | id (curto) | título novo | schema |
|---|---|---|---|---|
| 1 | pilula_a | bb6e7eb7 | construir sem programar: a barreira caiu | `pilula_editorial` com vídeo |
| 2 | pilula_b | fe1a538c | o mapa das ferramentas: cada uma serve pra uma coisa | `pilula_editorial` sem vídeo |
| 3 | pilula_c | 2c38146c | o que o no-code NÃO resolve | `pilula_editorial` sem vídeo |
| 4 | exercicio_pbl | 55c942d5 | expedição: 2 ferramentas, 1 olhar crítico | `pbl_estruturado` |
| 5 | registro | aa9a9602 | meu radar de ferramentas | `checklist_pacto` |

## Conteúdo por pílula

Copio literal o brief que você mandou. Sem parafrasear. Cada `body_md` fica com o resumo de 1-2 linhas no mesmo padrão dos módulos 1-3.

**Pílula A** — 7-9 min, com vídeo (youtube 6gn8yFcMnU4). Gancho com destaque `13% a.a.` (fonte mordor intelligence). Aprofundamento com no-code vs low-code + o que a ia mudou + destaque "a barreira técnica caiu…". Síntese "no-code não é atalho pra não pensar…". Reflexão sobre 1 coisa da rotina.

**Pílula B** — 6-8 min, sem vídeo (estrutura pronta pra receber depois: campo `video` fica ausente, `PillEditorial` só omite o bloco). Gancho com destaque `5` categorias. Aprofundamento com as 5 categorias (apps web, sites, planilha, automações, protótipos) + fechamento sobre lovable + destaque "ferramenta boa é a que resolve o SEU problema…". Síntese "conhecer categorias vale mais…". Reflexão amarrando com a pílula A.

**Pílula C** — 5-7 min, sem vídeo. Gancho com destaque `3` limites. Aprofundamento com escala extrema, controle fino, pensamento + destaque "a ferramenta amplia quem você é". Síntese "quem pensa bem constrói bem…". Reflexão sobre animação vs pé atrás.

**Exercício PBL** — 20-28 min, `pbl_estruturado` com `contexto`, `passos` (4 items), 5 `campos` (ferramenta_1, achados_1, ferramenta_2, achados_2, veredicto — tipos text/textarea conforme brief) e `dica`.

**Registro** — 4-6 min, `checklist_pacto` com `contexto`, 3 `compromissos`, `reflexao` (top 5 pessoal) e `completion.label = "concluir módulo 4"`.

## Como aplico

Um único bloco `supabase--insert` com 5 UPDATEs `WHERE id = '<uuid>'` setando `title`, `body_md`, `duration_min_low`, `duration_min_high` e `interaction_schema` (jsonb). Os schemas seguem o formato exato validado nos módulos 1-3 (`type`, `gancho.md`, `gancho.destaque_numero`, `gancho.destaque_legenda`, `video?`, `aprofundamento.md`, `aprofundamento.destaque`, `sintese.frase`, `reflexao.prompt`, `reflexao.placeholder`, `completion.label`) — dispatcher em `ModuloPillList.tsx` roteia sem mudança de código.

## Fora do escopo

- Módulos 5-10 (ficam pra próximas iterações)
- Módulo 4 da eletiva de economia circular
- Publicar ou liberar via `module_releases`
- Qualquer alteração em componentes React
