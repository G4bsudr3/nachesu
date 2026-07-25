## Aula 4 — Prova de Realidade (economia circular)

Módulo já existe (`8c71dbda-...`, número 4, publicado). Vou reescrever os 5 blocos conforme briefing, criar 1 pílula nova de coleta de evidências (com templates dinâmicos por método) e a tela pós-conclusão. Segue a mesma arquitetura das Aulas 1–3.

### 1. Migração do módulo (SQL, sem dropar)

- Atualizar `modules` #4: `title = "encontro 4 · até aqui você teve hipótese. agora precisa de prova."`, `objective = "produzir 3 evidências reais do problema escolhido — método científico em 50 min."`
- Reescrever `module_pills` (delete + insert por `order_index`, preservando `id` via upsert quando possível):
  1. **abertura** (`pilula_a`, `video_with_transcript`): headline, subheadline, transcrição do briefing, botão "começar".
  2. **conteúdo curado** (`pilula_b`, `curated_content_with_questions`): 2 cards (IDEO Field Guide PDF + Valkíria) + 3 perguntas-guia. A pergunta 3 é `single_choice` com key `metodo_escolhido` (valores `observacao|entrevista|coleta|mistura`) — salvo em `content.metodo_escolhido` do deliverable.
  3. **atividade prática — caça às 3 evidências** (`exercicio_pbl`, novo tipo `caca_evidencias`): puxa problema (Aula 1) + mapa de atores (Aula 3) no topo, renderiza template dinâmico conforme `metodo_escolhido`, valida 3 evidências + síntese ≥200 chars + ≥1 evidência com upload real.
  4. **checagem rápida** (`pilula_c`, `curated_content_with_questions`): 3 perguntas (cenário, múltiplas corretas, texto longo). Requer suporte a `multi_choice` no `PillConteudoCurado`.
  5. **bônus** (`bonus`, esquema atual `bonus_link_com_reflexao`): card MJV + campo opcional "técnica avançada".

### 2. Componente novo `PillCacaEvidencias.tsx`

- Recebe `moduleId`, `content`, `updateSection`, `pillSchema`, `courseSlug`.
- Puxa via hook o problema escolhido (`radar` da Aula 1) e o mapa de atores (Aula 3) para exibir cabeçalho contextual (read-only).
- Lê `metodo_escolhido` do próprio deliverable; se ausente, mostra aviso "escolha o método na pílula anterior" com link.
- Renderiza 3 fichas de evidência conforme método:
  - **observação**: data, hora, local, descrição factual, quantidade, upload foto (via `EvidenceUploader` no bucket `radar-evidences`, subpasta `aula4/`).
  - **entrevista**: upload de áudio (MP3/M4A, ≤5 min, ≤10 MB) + 3 "frases marcantes" + perfil do entrevistado.
  - **coleta**: link, data, fonte, "o que isso prova".
  - **mistura**: para cada uma das 3 fichas, seletor de tipo + campos correspondentes.
- Campo síntese (textarea, mín 200 chars).
- Validação e barra de status igual ao `PillPBLEstruturado`.
- Persistência: `content.caca_evidencias[pill_id] = { metodo, evidencias:[{tipo,...campos,upload_path}], sintese }`.

### 3. Ajustes em componentes existentes

- `EvidenceUploader`: já grava em `radar-evidences`. Adicionar prop `subfolder` para separar `aula1/` de `aula4/`; aceitar áudio (mime `audio/*`) além de imagem.
- `PillConteudoCurado`: adicionar `multi_choice` (checkboxes + validação de conjunto correto) para a pergunta 2 do checkpoint.
- `ModuloPillList`: registrar `caca_evidencias` → `<PillCacaEvidencias />`, mesma mecânica das outras interações.

### 4. Tela final `ModuloConclusaoEvidencias.tsx`

- Rota nova como as anteriores (`Modulo.tsx` decide qual conclusão exibir baseado no módulo).
- Headline "missão 4 cumprida" + texto do briefing.
- Lista as 3 evidências (mostra thumbnail/áudio player/link + descrição) e a síntese.
- CTA "ver minhas evidências" → dashboard da eletiva.

### 5. Admin `AdminEletivaModulo4.tsx`

- Rota `/admin/eletiva/economia-circular/modulo/4` (registrar em `App.tsx`).
- RPC nova `admin_module4_evidencias_stats` (admin-only, security definer):
  - KPIs: total estudantes ativos na eletiva, iniciaram módulo 4, concluíram, entregaram evidências.
  - Distribuição por método escolhido (barras).
  - % que anexou pelo menos 1 arquivo real (foto/áudio) vs só texto.
  - Amostras recentes de sínteses (últimas 10, com nickname).
- UI espelhando `AdminEletivaModulo3`.

### 6. Tom / copy

- Direto, adulto, sem infantilizar. Mensagens de erro apoiam ("sem evidência ainda? tudo bem, respira e volta quando estiver em campo").
- Alternativa clara para quem não conseguir entrevistar: destaque no card do método entrevista ("sem conseguir? troca pra coleta documental sem culpa").

### Detalhes técnicos

- Reutiliza `useDeliverable` + `updateSection` (já autosalva).
- Storage: bucket `radar-evidences` já existe e é público-read com upload autenticado; adicionar policy adicional só se limite de mime bloquear áudio (verificar antes; caso bloqueie, migração ajusta policy).
- Transcrição Whisper: fora do escopo desta entrega (registrado como follow-up).
- Não altera schema de outras aulas nem mexe em fluxo Chŏra legado.

### Ordem de execução

1. Migração pílulas + RPC admin.
2. `EvidenceUploader` (subfolder + áudio) e `PillConteudoCurado` (multi_choice).
3. `PillCacaEvidencias`.
4. `ModuloConclusaoEvidencias` + wiring em `Modulo.tsx`.
5. `AdminEletivaModulo4` + rota.
6. Verificação: abrir aula 4 no preview em desktop e mobile, testar cada método e a página admin.
