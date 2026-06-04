## módulo 2 — prompt engineering: pedir bem é pensar bem

reuso máximo do que o módulo 1 já tem (PillEditorial, PillVideoEmbed, fluxo de bloqueio sequencial, dashboard, modulo page) + 3 novas peças visuais autorais pra entregar o conteúdo do doc sem perder o tom NachesU.

### 1. migração de conteúdo (substitui as pílulas placeholder do módulo 2)

módulo 2 já existe em DB (`5f394184…`, trilha Fundamentos & IA) com 5 pílulas placeholder publicadas. uma migração `update_module_2_prompt_engineering`:

- `UPDATE modules` → title `prompt engineering: pedir bem é pensar bem`, objective conforme doc, `total_minutes = 50`.
- `DELETE FROM module_pills WHERE module_id = …` (placeholders atuais).
- `INSERT` 5 novas pílulas, todas published, sequencial 1→5:
  1. **pílula A** `pilula_editorial` — conteúdo bruto do doc, vídeo Pedro Burgos out/2025.
  2. **pílula B** `pilula_editorial_corf` (novo schema) — gancho + **signature CORF** + vídeo mai/2026 + aprofundamento + reflexão + síntese.
  3. **pílula C** `pilula_editorial` com novo campo opcional `comparacao_niveis` (3 cards lado a lado) — vídeo mar/2026.
  4. **exercício PBL** `pbl_corf_triplo` (novo schema) — 3 entregas (prompt CORF + 2 prints + reflexão por prompt) + conclusão geral.
  5. **registro** `guia_de_prompts` (novo schema) — 3 templates editáveis + 2 prints + reflexão final.

interaction_schema com o texto completo do doc (gancho, vídeo, aprofundamento, destaque, reflexão, síntese) pra cada uma. nada hardcoded em componente.

### 2. componentes novos (frontend)

todos no padrão visual do módulo 1 (Recoleta + Caveat + paleta naches), com `useAutoSaveField` e `EvidenceUploader` reaproveitados.

- `src/components/eletiva/pills/CorfSignature.tsx` — bloco animado: 4 cards C / O / R / F, Recoleta clamp(96-150px), stagger 200ms, mask reveal por baixo revelando palavra (Contexto / Objetivo / Regras / Formato). respeita `useReducedMotion`. usado dentro de PillEditorial via slot novo `signature_corf`.
- `src/components/eletiva/pills/ComparacaoNiveis.tsx` — 3 cards verticais (nível fraco / OK / forte) com prompt + resposta esperada, paleta com escalada de saturação. injetado em PillEditorial via slot opcional `comparacao_niveis`.
- `src/components/eletiva/pills/PillPBLCorfTriplo.tsx` — fork enxuto do PillPBLEstruturado:
  - lista os 3 prompts ruins do doc como cards Caveat numerados.
  - 3 blocos de entrega (prompt CORF textarea com placeholder CORF, print ruim, print CORF, "o que mudou").
  - bloco final "conclusão geral" (textarea).
  - validação: cada bloco precisa de textarea ≥ 2 chars + 2 evidências + textarea final.
  - salva em `content.pbl_corf` (mapa por pillId pra não colidir com pbl_estruturado).
- `src/components/eletiva/pills/PillGuiaDePrompts.tsx` — registro com:
  - 3 templates editáveis (Estudar, Redação, Resumo) renderizados como cards com `<textarea>` mono-spaced pré-preenchido pelos templates do doc (placeholders `[...]` clicáveis pra editar).
  - 2 uploads (melhor resposta / segunda melhor) + por que cada uma.
  - textarea de reflexão final.
  - salva em `content.guia_prompts`.

### 3. integração no dispatcher

`ModuloPillList.tsx`:
- adicionar slots `signature_corf` e `comparacao_niveis` ao tipo Schema de PillEditorial e renderizar quando presentes.
- adicionar branches `schemaType === "pbl_corf_triplo"` e `schemaType === "guia_de_prompts"` direcionando pros novos componentes.

### 4. validação visual + funcional

- abrir `/app/eletiva/ia-na-pratica/modulo/2` com user de teste já com módulo 1 concluído → checar fluxo completo, autosave, validação, animação CORF em desktop + mobile, reduced-motion fallback.
- conferir bloqueio sequencial: pílula A liberada, B só abre quando A é concluída, etc.
- conferir que celebração final dispara ao concluir registro.
- rodar tests existentes (`bunx vitest run`) pra garantir que nada do módulo 1 regrediu.

### detalhes técnicos

- nenhum schema novo precisa de migração em outra tabela: tudo cabe em `module_pills.interaction_schema` (jsonb) + `module_deliverables.content` (jsonb).
- vídeos via `PillVideoPlayer` (já lida com YouTube).
- copy: tudo lowercase, "você", sem em-dash, sem hashtag.
- accent das pílulas da trilha 1 = `#fe7b02` (laranja), já vem do `trailColorByOrder`.
- nenhum mexe em RLS (module_pills/module_deliverables já têm políticas certas).
- arquivos novos exportados via `src/components/eletiva/pills/index.ts`.

### fora de escopo

- editor admin pra esses novos schemas (admin pode editar via SQL nesse momento; AdminPillsEditor fica pra depois).
- módulos 3-20.
- gamificação / XP.
