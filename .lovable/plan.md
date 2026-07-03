
## contexto

os módulos 4 e 5 da eletiva `economia-circular` já existem no banco (unpublished, com placeholder de 5 pílulas cada e títulos antigos). o pedido é substituir esse conteúdo pelos dois planos operacionais do Dudu:

- **encontro 4 — prova de realidade: evidências do problema em BH** (fecha a caça a evidências)
- **encontro 5 — escolha do problema e fluxo** (fechamento da trilha 1)

toda a infra necessária já existe: `PillAbertura` (vídeo + transcript), `PillConteudoCurado`, `PillPBLEstruturado` (com `EvidenceUploader` embutido), registro reflexivo. o dispatcher em `ModuloPillList.tsx` já entende os `interaction_schema.type` que vamos usar. não precisa componente novo.

premissa a confirmar quando eu implementar: `IMG_4515.MOV` = abertura do módulo 4, `IMG_4516.MOV` = abertura do módulo 5 (posso trocar em 10 segundos se for o contrário).

## fase 1 — hospedar os dois vídeos de abertura

usar `lovable-assets` a partir de `/mnt/user-uploads/` pra publicar os dois `.MOV` como assets CDN, sem entrar no repo:

```
mkdir -p src/assets/dudu
lovable-assets create --file /mnt/user-uploads/IMG_4515.MOV --filename dudu-modulo-04-abertura.mov > src/assets/dudu/modulo-04-abertura.mov.asset.json
lovable-assets create --file /mnt/user-uploads/IMG_4516.MOV --filename dudu-modulo-05-abertura.mov > src/assets/dudu/modulo-05-abertura.mov.asset.json
```

as urls públicas resultantes vão pro `video_url` de cada pílula A.

## fase 2 — migration reescrevendo módulos 4 e 5 e suas pílulas

uma única migration que:

1. atualiza `modules` (número 4 e 5 do curso `c0a00000-...002`):
   - módulo 4:
     - title: `encontro 4 · prova de realidade`
     - objective: `sair do achismo e trazer 3 evidências reais do problema escolhido em BH.`
     - deliverable_description: `3 evidências (foto, áudio de entrevista curta ou registro documental) + 1 parágrafo de síntese conectando elas.`
     - total_minutes: 50
   - módulo 5:
     - title: `encontro 5 · escolha do problema e fluxo`
     - objective: `fechar a trilha enxergar decidindo o problema definitivo e o fluxo circular associado.`
     - deliverable_description: `briefing do projeto em 1 página: how might we + fluxo escolhido + evidências resumidas + trade-off + justificativa pessoal.`
     - total_minutes: 50

2. faz `UPDATE` nas 5 pílulas já existentes de cada módulo (mantém os `id` pra não invalidar progresso). estrutura repetida (A / B / C / PBL / registro):

### módulo 4 (encontro · prova de realidade)

| ordem | kind | schema.type | conteúdo |
| --- | --- | --- | --- |
| 1 | pilula_a | `video_with_transcript` | abertura do Dudu: por que hoje é a divisora de águas, o que é evidência (quantitativa, qualitativa-vivida, documental), `video_url` = asset dudu-04. duração 5 min |
| 2 | pilula_b | `curated_content_with_questions` | "como fazer uma boa entrevista de descoberta" (design kit / IDEO), com 2 perguntas nível 8 de checagem. duração 6-8 min |
| 3 | pilula_c | `curated_content_with_questions` | guia rápido de observação de campo (texto autoral curto, já que material Sebrae é substituível), 1 pergunta nível 8. duração 5-7 min |
| 4 | exercicio_pbl | `pbl_estruturado` | "caça às 3 evidências". schema com 3 blocos: evidência 1, evidência 2, evidência 3. cada bloco pede método (observação / entrevista / documental), local, o que revela, + `EvidenceUploader` (foto / áudio / print / vídeo curto). duração 22-28 min |
| 5 | registro | (sem schema, `prompt`) | prompt: "das 3 evidências, o que mais te surpreendeu? sua hipótese inicial se confirma ou muda?" duração 3-6 min |

### módulo 5 (encontro · escolha do problema e fluxo)

| ordem | kind | schema.type | conteúdo |
| --- | --- | --- | --- |
| 1 | pilula_a | `video_with_transcript` | abertura do Dudu: hoje é encruzilhada, briefing ancora tudo daqui pra frente, `video_url` = asset dudu-05. duração 5 min |
| 2 | pilula_b | `curated_content_with_questions` | "os 6 fluxos de uma cidade circular" (materiais, alimentação, energia, água, mobilidade, tecnologia), 2 perguntas nível 8. duração 6-8 min |
| 3 | pilula_c | `curated_content_with_questions` | "how might we bem construído: específico, provocador, acionável" (IDEO), 1 pergunta nível 8 pedindo pra classificar 2 exemplos como bem/mal formulados. duração 5-7 min |
| 4 | exercicio_pbl | `pbl_estruturado` | "briefing do projeto". schema com campos: título do projeto, problema em how might we, fluxo principal (select entre os 6), fluxo secundário (opcional), 3 evidências resumidas (1 frase cada), quem ganha vs. quem perde, justificativa pessoal. duração 22-30 min |
| 5 | registro | (sem schema, `prompt`) | prompt: "você trocou de problema depois das evidências? o que mudou na sua leitura? por que esse fluxo e não outro?" duração 3-6 min |

3. mantém `published = false` pra revisão antes de liberar.

todos os `body_md` vão em lowercase, tom Naches, sem em-dash, sem emoji em UI, com microcopy tutorial embutido nos passos com fricção (uploader, entrevista, briefing).

## fase 3 — publicar e liberar pros estudantes

migration separada (ou passo manual via admin), quando o Dudu aprovar o conteúdo:

- `UPDATE modules SET published = true WHERE ...` pros módulos 4 e 5
- `INSERT INTO module_releases (module_id, released_at)` pra ambos, respeitando o calendário semanal (deixa `released_at` vazio se for liberar manual pelo admin)

isso já usa o pipeline de trigger que dispara notificação `notify_module_released` que existe.

## fase 4 — refinamentos opcionais (v2, fora do escopo agora)

três coisas do plano do Dudu que ficam pra depois pra não travar o essencial:

- **geração automática de PDF do briefing (encontro 5).** exige edge function com puppeteer/pdfkit. no MVP, o entregável fica em `module_deliverables` como texto estruturado (dá pra exportar depois).
- **dashboard "distribuição de fluxos da turma em tempo real" + nudge suave.** exige tela nova pro admin + notificação parametrizada. proponho abrir como card separado depois que a turma real começar.
- **componente "critério dos 4 filtros" mostrando respostas anteriores do encontro 1, 3 e 4.** dá pra puxar de `module_deliverables` das aulas prévias, mas é ui nova. no MVP, os 3 filtros ficam explicitados como texto na pílula B do módulo 5.

## como valido

- abrir `/app/modulo/4` e `/app/modulo/5` logado como frattz (admin, matriculado): as 5 pílulas renderizam com o schema correto, vídeo do Dudu toca, uploader aceita foto/áudio/print, briefing salva, registro final grava reflexão em `module_deliverables`
- rodar `SELECT * FROM module_pills WHERE module_id IN (...)` conferindo que o `interaction_schema` bate com o dispatcher
- `npm run typecheck` limpo (nenhuma alteração de código, só dados)

## detalhes técnicos (referência interna)

- schemas usados já estão registrados em `src/components/eletiva/modulo/ModuloPillList.tsx` (`video_with_transcript`, `curated_content_with_questions`, `pbl_estruturado`)
- `PillPBLEstruturado` aceita `EvidenceUploader` embutido em qualquer campo do schema (via `evidence_kind`), então o "caça às 3 evidências" fica num único pbl estruturado com 3 blocos, sem componente novo
- ids das pílulas preservados via `UPDATE`, não `DELETE`+`INSERT`, pra não zerar `student_pill_progress` de quem já tocou (nenhum estudante real ainda, mas garante consistência)
- todos os grants e rls existentes já cobrem: `module_pills` tem policy que libera pra estudante quando módulo publicado
