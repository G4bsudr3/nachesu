
## O que já existe (bom saber antes)

Rodei o banco. **As 5 pílulas do Módulo 1 de Economia Circular já estão criadas com o texto exato do briefing** — vídeo de abertura + transcrição, 2 cards curados com as 3 perguntas-guia, radar de campo com fluxos, quiz de 3 perguntas, bônus Kurzgesagt. Os componentes `PillAbertura`, `PillConteudoCurado`, `PillRadar`, `PillQuiz`, `PillBonus` também já existem em `src/components/eletiva/pills/`.

Ou seja: a Aula 1 já roda hoje. Este plano **não é "criar do zero"** — é fechar 4 lacunas específicas:

1. Adotar a paleta Duduo em toda a eletiva de Economia Circular
2. Trocar o upload de evidência do Radar (hoje só link) por upload real de imagem/áudio com bucket
3. Criar a tela final "missão 1 cumprida" renderizando a lista do aluno
4. Um dashboard básico do professor pra ver a turma

## 1. Paleta Duduo na eletiva inteira

Aplicar creme + vermelho-laranja + acentos secundários **só quando o slug do curso é `economia-circular`**. Zero impacto na eletiva de IA e no chrome NachesU (header/footer/dashboard `/app`).

**Tokens novos em `tailwind.config.ts`** (namespace `duduo`):
- `escuro #202124`, `creme #F5EEE1`, `dourado #EFD7A9`, `cinza #9AA0A7`, `rosa #F2D8DC`, `azul #448FF2`, `verde #75BF9C`, `amarelo #F2BC57`, `laranja #F25E3D`

**Font Sora 800** carregada em `index.html` (Google Fonts), exposta como `font-duduo-display`.

**Onde aplica** (dentro da eletiva `economia-circular`):
- `src/pages/EletivaHome.tsx` — hero, cards de módulo, próximo passo passam a usar `bg-duduo-creme` + accent `#F25E3D` + Sora 800 nos títulos. Continua com header/footer NachesU.
- `src/pages/Modulo.tsx` — mesmo tratamento. Bloco de instrução do Radar ganha o doodle de seta + fundo creme + caixa amarela `#F2BC57` da "regra anti-óbvio".
- Trocar `trails.color` das 4 trilhas de Economia Circular pra vermelho-laranja / dourado / rosa / verde-teal (migration), mantendo a lógica atual de "cor por trilha".
- `EletivaSwitcher` e `DualEletivasHero` no `/app` **não mudam** — chrome geral fica NachesU.

**Doodles** (setas, espirais, sublinhados desenhados à mão): 3-4 SVGs decorativos em `src/assets/duduo/` como componentes React de baixo peso. Usados como decoração nas seções de instrução, sem interatividade.

## 2. Upload real de evidência no Radar

- Novo bucket privado `radar-evidencias` via `supabase--storage_create_bucket`.
- RLS em `storage.objects`: aluno lê/insere/deleta só arquivos com path `{user_id}/...`; admin lê tudo.
- Refactor `EvidenceUploader.tsx` (já existe hoje só como link) pra aceitar 3 modos: **arquivo** (imagem/áudio até 10MB, validado no cliente e no server), **link** (URL), **texto** (fallback).
- Preview: thumb da imagem, player de áudio nativo, ou chip do link.
- URL assinada de 7 dias no professor pra visualizar.
- Estrutura salva em `deliverable.content.radar[i].evidence`: `{ kind: 'file'|'link'|'text', path?, url?, text?, mime?, size? }`.

## 3. Tela final "missão 1 cumprida"

Novo componente `ModuloConclusaoAula1.tsx` disparado em `Modulo.tsx` quando o módulo 1 da Economia Circular é concluído (após pílula 4 — o bônus continua opcional, sem bloquear).

- Headline Sora 800 grande "missão 1 cumprida"
- Texto do briefing (o dos "95% que ficam na teoria")
- Grid de cards renderizando cada item do Radar do aluno com evidência (thumb/áudio/link)
- CTA principal `#F25E3D`: "ver minha lista" → `/app/eletiva/economia-circular`
- CTA secundário cinza: "voltar pro início" → `/app`

Reusa a lógica de `ModuloCelebration.tsx` existente pra timing/animação.

## 4. Dashboard básico do professor

Nova rota `/admin/eletiva/economia-circular/modulo/1` (extensível pros outros módulos depois).

Já existe a função `compute_module_metrics(_module_id)` no banco — devolve total_students, started/completed, mediana de itens, distribuição de fluxos, tempo médio. Só falta a UI:

- Cards de KPI no topo (conclusão, mediana de itens, diversidade de fluxos, tempo médio)
- Gráfico de barras horizontal por fluxo (usar `recharts` — já no projeto)
- Tabela de alunos: nome · status (não iniciou / em andamento / concluído) · itens no radar · última atividade
- Botão "exportar csv" que serializa respostas + evidências (URLs assinadas) da turma

Alerta de evasão automático **fica pra próxima iteração** (você marcou notificações fora do escopo).

## Migrations necessárias

1. `update trails set color = ... where course_id = (select id from courses where slug='economia-circular')` — cores por trilha
2. Bucket `radar-evidencias` (via tool dedicada, não SQL) + policies RLS em `storage.objects`

Sem mudanças em schema de tabelas.

## Ordem de execução

1. Tokens Duduo (tailwind + index.css + Sora via link) — base pra tudo
2. Migration trilhas + doodles SVG
3. Refactor visual `EletivaHome` e `Modulo` só na eletiva Economia Circular
4. Bucket + refactor `EvidenceUploader` + `PillRadar`
5. `ModuloConclusaoAula1` + wiring em `Modulo.tsx`
6. Rota admin `/admin/eletiva/:slug/modulo/:n` + KPIs + tabela + export CSV

## Detalhes técnicos

- Nenhuma migração de dados existentes de aluno (as pílulas atuais já estão no schema esperado)
- Zero impacto na eletiva de IA na Prática — todo o tratamento Duduo é gated por `course.slug === 'economia-circular'`
- Mobile-first mantido em todo componente novo
- RLS em bucket seguindo padrão `{user_id}/...`
- CSV exportado via edge function nova `admin-export-radar` pra assinar URLs server-side
