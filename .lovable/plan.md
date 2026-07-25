# Aula 10 · mapa expandido + matriz poder × interesse

Fechamento da Trilha 2. Mesma anatomia das aulas 6-9: 5 blocos, pull da aula anterior, tela de conclusão dedicada e dashboard admin.

## Blocos

1. **Abertura (`video_with_transcript`)** — placeholder + transcrição ("ninguém faz nada sozinho")
2. **Conteúdo curado (`curated_content_with_questions`)** — 2 cards (guia de análise de stakeholders + case parceria improvável) + 3 perguntas (single com feedback, long_text, single com feedback)
3. **PBL Mapa + Matriz (`stakeholders_matriz`, novo schema)** — parte 1: 4 categorias × mín 2 stakeholders cada (nome específico, o que quer, como ajuda/atrapalha); parte 2: cada nome mapeado é atribuído a um dos 4 quadrantes poder × interesse (dropdown por card, não drag-drop — mais confiável mobile). Pull dos atores da aula 3 como sugestão de partida
4. **Checagem (`quiz`)** — cenário "comunidade escolar", multi-select riscos alto-poder-baixo-interesse, long_text "mais difícil de engajar"
5. **Bônus (`bonus_text`)** — colaboração em projetos de impacto (Aliança Empreendedora / Instituto Ethos) + campo opcional

## Novos arquivos

- `src/components/eletiva/pills/PillStakeholdersMatriz.tsx` — 4 seções (usuários, influenciadores, parceiros, oponentes) com cards adicionáveis; cada card exige nome + interesse + como ajuda/atrapalha + quadrante (alto/alto, alto/baixo, baixo/alto, baixo/baixo). Valida: mín 2 por categoria (8 total) + todo card com quadrante escolhido. Mostra sugestões dos atores da aula 3
- `src/components/eletiva/modulo/ModuloConclusaoStakeholders.tsx` — resumo: total mapeado por categoria + matriz 2×2 renderizada com nomes plotados
- `src/pages/AdminEletivaModulo10.tsx` — KPIs (entregas, média de stakeholders por aluno) + distribuição por quadrante + amostras

## Wiring

- `src/components/eletiva/pills/index.ts` — exporta `PillStakeholdersMatriz` + `StakeholdersMatrizValue`
- `src/components/eletiva/modulo/ModuloPillList.tsx` — registra schema `stakeholders_matriz` + mapa `stakeholders_aula10`
- `src/pages/Modulo.tsx` — renderiza `ModuloConclusaoStakeholders` quando `courseSlug === "economia-circular" && number === 10`
- `src/App.tsx` — rota `/admin/eletiva/economia-circular/modulo/10`

## Migração

- RPC `admin_module10_stakeholders_stats` no padrão da aula 9 (só admin, agrega quantidade média por categoria e distribuição por quadrante)
- Atualiza `modules.title/objective` do encontro 10
- `DELETE` + `INSERT` das 5 pílulas com `interaction_schema` completo, incluindo `mapa_atores_source_module_id` apontando pra aula 3

## Fora de escopo

- Drag-drop real (usar dropdown por card — mais robusto mobile-first e acessível)
- Vídeo real (placeholder)
- Alterar layout global de módulo
