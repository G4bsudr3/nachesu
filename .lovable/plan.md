# pílula 0 — "quem tá por trás dessa eletiva"

## ideia

uma pílula opcional, antes da pílula 1, só pra quem está curioso pra saber quem é o frattz. um único vídeo Loom embedado, sem tarefa, sem entrega. marcar como visto encerra.

ela aparece como um card mais discreto que as demais (não quero competir com a pílula 1, que é o começo "oficial"), com microcopy convidativo. como `required=false`, ela **não bloqueia** o avanço sequencial — quem ignorar segue direto pra pílula 1.

## o que vai aparecer

card no topo da lista de pílulas, com:

- selo lateral "00 · bônus · opcional"
- título: "quem tá por trás disso"
- subtítulo curto: "2 min com o frattz, se você quiser saber de onde isso vem. pode pular tranquilo."
- iframe do Loom em aspect 16/9, com bordas no padrão dos outros cards
- botão "vi, bora pra missão" (marca como concluída e some o destaque)

visual: borda mais leve, fundo bege puro (sem destaque colorido), pra deixar claro que é acessório. quando marcada, colapsa pro estilo "concluído" igual às outras.

## o que muda no código

### 1. dado (via insert)

inserir 1 linha em `module_pills` no módulo 1 de `ia-na-pratica` (`module_id = c0c8b85e-...` — buscar via select antes):

- `order_index = 0`
- `kind = 'pilula_a'` (reusando o enum existente, não vale migration pra um caso)
- `required = false`
- `title = 'quem tá por trás disso'`
- `body_md = '2 min com o frattz, se você quiser saber de onde isso vem. pode pular tranquilo.'`
- `duration_min_low = 2, duration_min_high = 2`
- `published = true`
- `interaction_schema = { type: 'video_embed', provider: 'loom', embed_url: 'https://www.loom.com/embed/c01ffb9665ce41c1864760aa373d977d' }`

as pílulas 1-5 atuais ficam como estão (`order_index` 1-5). nenhum reordering.

### 2. renderer novo — `PillVideoEmbed.tsx`

componente pequeno em `src/components/eletiva/pills/PillVideoEmbed.tsx`:

- recebe `title`, `bodyMd`, `schema.embed_url`, `accent`, `onComplete`, `isCompleted`
- monta `<iframe src={embed_url} allow="fullscreen" allowFullScreen>` em wrapper `aspect-video rounded-2xl`
- botão "vi, bora pra missão" (ou "ok, já vi" se opcional) que chama `onComplete`
- sem entrega, sem tutor, sem accordion

exportar em `src/components/eletiva/pills/index.ts`.

### 3. dispatcher — `ModuloPillList.tsx`

- adicionar branch no roteador por `schema.type === 'video_embed'` → renderiza `PillVideoEmbed`
- ajustar `pillKindLabel` ou usar um override local: quando `order_index === 0` **e** `!required`, mostrar `"bônus"` em vez de "abertura" no selo do card

### 4. liberação sequencial

já tratado pelo `unlockedPillIds` em `Modulo.tsx`: pílula opcional não bloqueia. confirmar visualmente que a pílula 1 segue desbloqueada mesmo sem marcar a 0.

## fora do escopo

- não criar valor novo no enum `pill_kind` (sem migration)
- não mexer em outras eletivas nem em outros módulos
- não tocar em `PillVideoPlayer` existente (loom merece um componente próprio, mais limpo)
- sem transcrição, sem tutor, sem PBL — é só o vídeo

## arquivos tocados

- `src/components/eletiva/pills/PillVideoEmbed.tsx` (novo)
- `src/components/eletiva/pills/index.ts`
- `src/components/eletiva/modulo/ModuloPillList.tsx`
- `INSERT` em `module_pills` (via insert tool)
