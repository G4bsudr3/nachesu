# Aula 11 · sprint de ideação (4 rodadas × 5 min)

Abertura da Trilha 3 "Criar". Mesma anatomia das aulas 6-10: 5 blocos, pull da aula anterior, tela de conclusão dedicada e dashboard admin.

## Blocos

1. **Abertura (`video_with_transcript`)** — headline "criatividade não é dom. é volume." + transcrição das regras do Osborn
2. **Conteúdo curado (`curated_content_with_questions`)** — 2 cards (SCAMPER + regras do brainstorming IDEO/Sebrae) + 2 perguntas single_choice com feedback (5ª ideia + córtex crítico)
3. **PBL Sprint de Ideação (`sprint_ideacao`, novo schema)** — 4 rodadas sequenciais com timer de 5min cada + provocações rotativas + input rápido de ideias. Pull automático do HMW (aula 5) e da oportunidade top da aula 7. Bloqueia deletar durante ideação (só na fase de compilação, com aviso). Valida mín 15 ideias no total, sinaliza 20+ como meta
4. **Checagem (`quiz`)** — cenário fluência caindo, multi-select verdades sobre ideação, long_text ideia mais doida
5. **Bônus (`bonus_text`)** — TED David Kelley creative confidence

## Novos arquivos

- `src/components/eletiva/pills/PillSprintIdeacao.tsx` — componente com 4 tabs de rodada + timer visual (mm:ss regressivo, controle play/pause, som opcional). Cada rodada carrega provocações do schema, input "+ ideia" com Enter pra adicionar. Fase final "compilação" mostra todas as ideias em lista única editável, botão delete só ativa após pedir confirmação explícita. Pull no topo (HMW + oportunidade). CTA "entregar sprint" habilita com ≥15 ideias
- `src/components/eletiva/modulo/ModuloConclusaoSprintIdeacao.tsx` — resumo com total de ideias, quebra por rodada e amostra das 5 mais recentes
- `src/pages/AdminEletivaModulo11.tsx` — KPIs (matriculados, entregas, média de ideias/aluno, % que atingiu 20+, distribuição por rodada) e amostras

## Wiring

- `src/components/eletiva/pills/index.ts` — exporta `PillSprintIdeacao` + `SprintIdeacaoValue`
- `src/components/eletiva/modulo/ModuloPillList.tsx` — registra schema `sprint_ideacao` + mapa `ideias_aula11`
- `src/pages/Modulo.tsx` — renderiza `ModuloConclusaoSprintIdeacao` quando `courseSlug === "economia-circular" && number === 11`
- `src/App.tsx` — rota `/admin/eletiva/economia-circular/modulo/11`

## Migração

- RPC `admin_module11_ideacao_stats` no padrão da aula 10 (só admin, agrega total de ideias por aluno e distribuição por rodada)
- Atualiza `modules.title/objective` do encontro 11
- `DELETE` + `INSERT` das 5 pílulas com `interaction_schema` completo, incluindo as 4 rodadas com provocações e o `briefing_source_module_id` (aula 5) e `matriz_source_module_id` (aula 7)

## Fora de escopo

- Som real de timer (nice-to-have, silêncio por padrão)
- Vídeo real (placeholder)
- Ranking/agrupamento de ideias — isso é aula 12
