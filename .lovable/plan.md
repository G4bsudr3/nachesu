# Aula 12 · escolher é abandonar

Segunda pílula da Trilha 3 "Criar". Mesma anatomia das aulas 6-11: 5 blocos, pull da aula anterior, tela de conclusão dedicada e dashboard admin.

## Blocos

1. **Abertura (`video_with_transcript`)** — "escolher é abandonar", transcrição sobre impacto × viabilidade + raridade + refinamento
2. **Conteúdo curado (`curated_content_with_questions`)** — 2 cards (matriz priorização impacto × esforço + intro Sebrae ao Lean Startup) + 3 perguntas (2 single_choice + 1 long_text sobre "e se fossem 4 semanas?")
3. **PBL Matriz + Refinamento (`selecao_ideia`, novo schema)** — três partes num único componente: (a) drag-drop das 20 ideias da aula 11 nos 4 quadrantes impacto × viabilidade, (b) escolha final entre as do quadrante IDEAL com filtro de raridade (radio a/b/c + confirmação extra se "óbvia mesmo"), (c) refinamento em 3 versões (A original, B escala, C ângulo) com validação de distinção textual (similaridade simples via tokens)
4. **Checagem (`quiz`)** — cenário lixeiras coloridas, multi-select variação de escala, long_text plano B
5. **Bônus (`bonus_text`)** — artigo "22 tipos de MVP" (Evolve MVP)

## Novos arquivos

- `src/components/eletiva/pills/PillSelecaoIdeia.tsx` — pill com pull das 20 ideias da aula 11 (via `useQuery` em `module_deliverables` do módulo 11, campo `ideias_aula11`). Interface em 3 abas: MATRIZ → ESCOLHA → REFINAMENTO. Drag-drop desktop + fallback dropdown mobile (padrão já usado em outras aulas). Similaridade textual: normaliza e compara sobreposição de tokens; se >70% entre B ou C e A, mostra aviso. CTA "entregar seleção" só habilita quando: 1 ideia final + raridade respondida + 3 versões preenchidas e distintas
- `src/components/eletiva/modulo/ModuloConclusaoSelecaoIdeia.tsx` — resumo com ideia escolhida em destaque, tag de raridade e as 3 versões lado a lado
- `src/pages/AdminEletivaModulo12.tsx` — KPIs (matriculados, entregas, distribuição por quadrante, distribuição de raridade a/b/c) + amostras (ideia final por aluno)

## Wiring

- `src/components/eletiva/pills/index.ts` — exporta `PillSelecaoIdeia` + `SelecaoIdeiaValue`
- `src/components/eletiva/modulo/ModuloPillList.tsx` — registra schema `selecao_ideia` e mapa `selecao_aula12`
- `src/pages/Modulo.tsx` — renderiza `ModuloConclusaoSelecaoIdeia` quando `courseSlug === "economia-circular" && number === 12`
- `src/App.tsx` — rota `/admin/eletiva/economia-circular/modulo/12`

## Migração

- RPC `admin_module12_selecao_stats` no padrão da aula 11 (só admin, agrega distribuição de quadrante, raridade e amostras)
- Atualiza `modules.title/objective` do encontro 12
- `DELETE` + `INSERT` das 5 pílulas do módulo 12 com `interaction_schema` completo, incluindo `ideias_source_module_id` (aula 11)

## Fora de escopo

- Ranking/pitch — isso é aula 13+
- Análise semântica pesada de similaridade (usar heurística de tokens simples)
