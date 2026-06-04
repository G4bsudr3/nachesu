## aula 2 — economia circular: "reciclar não é o suficiente"

doc da aula 2 chegou agora. é a aula `7dd1ad90-…` (trilha enxergar, módulo 2), hoje só com 5 pílulas placeholder. vou substituir todo o conteúdo seguindo o padrão visual e técnico atual da plataforma — sem inventar tabela nova, sem importar a paleta duduo crua, mantendo NachesU.

### 1. identidade visual (adaptação parcial conforme combinado)

- mantém League Gothic + Urbanist, bege #f2e4d8, mascote joão-de-barro (poses por contexto), tom lowercase + você.
- accent específico da trilha 1 (economia circular) = **laranja #F25E3D** já vem via `trailColorByOrder`; reuso onde o doc pede destaque.
- classificador usa 3 cores semânticas só pra categorizar:
  - linear = cinza grafite (`#9AA0A7`)
  - circular = verde sálvia (`#75BF9C`)
  - regenerativo = azul royal (`#448FF2`)
  - aplicadas só nos chips de classificação, não na cromia geral.
- ignoro Sora 800 / fundo escuro / doodles duduo — tom NachesU bege + League Gothic prevalece.

### 2. migração de conteúdo (substitui as 5 pílulas placeholder)

`UPDATE modules` no `7dd1ad90-…`: title = `reciclar não é o suficiente`, objective conforme doc, `total_minutes = 50`.

`DELETE FROM module_pills WHERE module_id = '7dd1ad90-…'` + `INSERT` 5 novas, todas published:

1. **abertura** `pilula_a` schema `video_with_transcript` (`PillAbertura`) — headline "reciclar não é o suficiente" + subheadline + vídeo intro aula 2 + transcrição em accordion.
2. **conteúdo curado + perguntas-guia** `pilula_b` schema `curated_content_with_questions` (`PillConteudoCurado` ✓ já existe) — 2 cards (vídeo TV Senado + texto Ellen MacArthur) + 3 perguntas (long_text, single_choice com feedback, long_text).
3. **exercício PBL — classificador 3×3** `exercicio_pbl` schema novo `classificador_linear_circular_regenerativo` (componente novo `PillClassificador3x3`) — 10 itens fixos do doc + 3 puxados do radar da aula 1.
4. **checagem rápida** `pilula_c` schema `quiz` (`PillQuiz` ✓ já suporta single + multi_choice) — 3 perguntas (cenário garrafa reciclada, multi-select de práticas regenerativas, long_text salvo pra encontro 5).
5. **bônus opcional** `registro` schema `bonus_text` (`PillBonus` ✓) — story of stuff com disclaimer + campo opcional.

todo o copy (gancho, transcript, feedbacks, gabarito interno) vai no `interaction_schema` jsonb — nada hardcoded no componente.

### 3. componente novo — `PillClassificador3x3`

`src/components/eletiva/pills/PillClassificador3x3.tsx`:

- lê 10 `fixed_items` do schema + busca 3 primeiros itens do radar da aula 1 do mesmo usuário (deliverable do módulo `d89dc321`, campo `content.items[0..2].label`).
- se aluno tiver menos de 3 itens no radar, banner caveat: "precisa de pelo menos 3 itens no seu radar — volta lá e completa antes de seguir" + link `/app/eletiva/economia-circular/modulo/1`.
- cada um dos 13 itens vira card com chip de categoria (3 botões linear / circular / regenerativo). escolha salva em `content.classificacao_aula2[item_id]`.
- validação: 13 classificados + 3 justificativas (textarea ≥ 50 chars) escolhidas pelo aluno via toggle "justificar este".
- destaque amarelo (#F2BC57 adaptado pro bege NachesU) com o lembrete "linear = vaza valor / circular = mantém / regenerativo = devolve mais do que tira".
- tela de conclusão (dentro da própria pílula) mostra resumo visual com os 13 cards coloridos por categoria.
- autosave debounced via `useAutoSaveField` (padrão atual). evidências não são necessárias.

helper novo `useAula1RadarItems(userId, courseSlug)` — query simples no `module_deliverables` do módulo 1 do mesmo curso, retornando `items[0..2]`.

### 4. integração no dispatcher

`ModuloPillList.tsx`:
- adicionar branch `schemaType === "classificador_linear_circular_regenerativo"` → `PillClassificador3x3`.
- nenhum outro componente precisa mudar (B, C, abertura e bônus já existem).

export do componente em `src/components/eletiva/pills/index.ts`.

### 5. vídeo intro

`Vídeo Intro Aula 2.mov` (~70MB) → subir como asset via `lovable-assets create --file /mnt/user-uploads/...`, salvar pointer JSON em `src/assets`. URL vai pro `interaction_schema.video.url` da pílula 1.

### 6. validação visual + funcional

- abrir `/app/eletiva/economia-circular/modulo/2` com user-teste já com aula 1 concluída (3+ itens no radar) → fluxo completo, autosave, validação, classificador colorido em desktop + mobile.
- testar fallback: user sem aula 1 → banner avisa e bloqueia avanço.
- bloqueio sequencial: pílula B só abre após A, etc.
- multi-select da checagem (pergunta 2) precisa marcar 2 corretas → confirmar que `PillQuiz` valida múltiplas corretas (já valida; uso o schema `correct_values[]`).
- `bunx vitest run` pra garantir que nada regrediu.

### detalhes técnicos

- só toca em `module_pills` + componentes frontend. nenhuma migração de schema.
- `content.classificacao_aula2` é um sub-objeto novo em `module_deliverables.content` (jsonb), não colide com `items` / `guided_answers` / `quiz_answers`.
- mantém RLS atual (políticas já estão certas).
- copy: lowercase, "você", zero em-dash, zero hashtag, zero emoji.

### fora de escopo

- dashboard do professor com distribuição agregada das classificações (item bom, mas fora do MVP do estudante; abrimos issue depois).
- editor admin pra esses schemas novos.
- aula 3 (iceberg + mapa de atores) — já tem plano em espera, foco agora é só aula 2.
