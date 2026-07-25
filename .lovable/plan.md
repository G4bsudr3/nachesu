# Aula 9 · matriz antes vs. depois

Mesma anatomia das aulas 6/7/8: 5 blocos, pull da aula anterior, tela de conclusão dedicada e dashboard admin.

## Blocos

1. **Abertura (`video_with_transcript`)** — vídeo placeholder + transcrição colapsável ("não basta não estragar. tem que melhorar.")
2. **Conteúdo curado (`curated_content_with_questions`)** — 2 cards (EMF Regenerar + case brasileiro) + cartaz Triple Bottom Line (3P's) via `complement`; 3 perguntas (multi, long_text, single com feedback)
3. **PBL Matriz Antes vs. Depois (`impactos_3p`, novo schema)** — 3 linhas fixas (planeta, pessoas, prosperidade). Pull do HMW (aula 5) + princípios EMF escolhidos (aula 8). Valida regex `/\d+/` na métrica + comprimentos mínimos em atual/desejado + bloqueia palavras "reduzir/minimizar/diminuir" isoladas no desejado
4. **Checagem (`quiz`)** — cenário "mais consciência", multi-select "boa métrica tem", long_text "manchete daqui a 5 anos"
5. **Bônus (`bonus_text`)** — TED Doughnut Economics (Kate Raworth) + campo opcional

## Novos arquivos

- `src/components/eletiva/pills/PillImpactos3P.tsx` — 3 cards fixos (planeta/pessoas/prosperidade) com atual/desejado/métrica, validação regex + anti-palavras genéricas, pull do HMW + princípios
- `src/components/eletiva/modulo/ModuloConclusaoImpactos.tsx` — resumo dos 3 impactos + suas métricas
- `src/pages/AdminEletivaModulo9.tsx` — KPIs (entregas, % com métrica válida nas 3 dimensões) + amostras das métricas

## Wiring

- `src/components/eletiva/pills/index.ts` — exporta `PillImpactos3P` e `Impactos3PValue`
- `src/components/eletiva/modulo/ModuloPillList.tsx` — registra schema `impactos_3p` + mapa `impactos_aula9`
- `src/pages/Modulo.tsx` — renderiza `ModuloConclusaoImpactos` quando `courseSlug === "economia-circular" && number === 9`
- `src/App.tsx` — rota `/admin/eletiva/economia-circular/modulo/9`

## Migração

- RPC `admin_module9_impactos_stats(course_slug, module_number)` no mesmo padrão da aula 8 (só admin, agrega taxa de métrica válida por dimensão)
- Atualiza `modules.title/objective` do encontro 9
- `DELETE` + `INSERT` das 5 pílulas com `interaction_schema` completo (transcrição, cards, cartaz 3P, perguntas com feedback, exemplos-âncora do PBL, TED bônus)

## Fora de escopo

- Vídeo real (placeholder até você mandar o arquivo)
- Alterar layout global de módulo, header ou navegação
