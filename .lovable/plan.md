# Aula 8 · regras do jogo do meu projeto

Segue o padrão das aulas 6 e 7: 5 blocos, pull automático do encontro anterior, tela de conclusão dedicada e dashboard admin.

## Blocos

1. **Abertura (`video_with_transcript`)** — vídeo placeholder + transcrição colapsável ("as 3 regras que separam circular de linear maquiado")
2. **Conteúdo curado (`curated_content_with_questions`)** — 2 cards EMF + cartaz visual dos 6 R's (renderizado dentro do próprio bloco), 3 perguntas (single, multi, long_text)
3. **PBL Regras do Jogo (`regras_jogo`, novo schema)** — pull do HMW do briefing (aula 5) + 5 oportunidades da aula 7; escolhe exatamente 2 princípios EMF + 1-2 R's; cada escolha exige justificativa (≥100 chars) + exemplo aplicado
4. **Checagem (`quiz`)** — cenário canetas, multi-select "regenerar", long_text "só 1 princípio"
5. **Bônus (`bonus_text`)** — card EMF Policy Goals + campo de reflexão opcional

## Novos arquivos

- `src/components/eletiva/pills/PillRegrasJogo.tsx` — dropdowns dos 3 princípios (bloqueando repetição), multi-select dos 6 R's (max 2), 5 campos de texto validados, pull do briefing HMW + oportunidades
- `src/components/eletiva/modulo/ModuloConclusaoRegrasJogo.tsx` — resumo dos 2 princípios + R's escolhidos com as justificativas
- `src/pages/AdminEletivaModulo8.tsx` — KPIs (submitted, distribuição dos princípios escolhidos, R's mais táticos) + amostras

## Wiring

- `src/components/eletiva/pills/index.ts` — exporta `PillRegrasJogo` e `RegrasJogoValue`
- `src/components/eletiva/modulo/ModuloPillList.tsx` — registra schema `regras_jogo` + mapa `regras_jogo_aula8`
- `src/pages/Modulo.tsx` — renderiza `ModuloConclusaoRegrasJogo` quando `courseSlug === "economia-circular" && number === 8`
- `src/App.tsx` — rota `/admin/eletiva/economia-circular/modulo/8`

## Migração

- RPC `admin_module8_regras_jogo_stats(course_slug, module_number)` seguindo padrão da aula 7 (só admin, agrega distribuição de `principio1`/`principio2` + `rs_taticos`)
- Atualiza `modules.title/objective` do encontro 8
- `DELETE` + `INSERT` das 5 pílulas do módulo 8 com `interaction_schema` completo (transcrição, cards, perguntas, opções EMF, opções 6 R's, validações)

## Validações do PBL (client + schema)

- `principio1 !== principio2` (bloqueia repetição)
- `rs_taticos.length` entre 1 e 2
- `justificativa1`, `exemplo1`, `justificativa2`, `exemplo2`, `como_ajudam` ≥100 chars nas justificativas (exemplos ≥40)

## Fora de escopo desta aula

- Vídeo real (fica placeholder até você mandar o arquivo, mesmo padrão das aulas anteriores)
- Alterar layout global de módulo, header ou navegação
