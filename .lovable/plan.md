# Passo 4: Mascotes Perestroika + Sistema de Cartas de Arquétipo

## Visão geral

A imagem que você enviou define a estética canônica: ilustração linha-fina, paleta Perestroika sobre fundo bege, props característicos. Vou gerar os 7 mascotes nesse padrão usando nano-banana pro com a própria imagem como referência visual a cada chamada (garante consistência entre os 7).

Em paralelo, monto o sistema de **cartas de arquétipo** completo: schema, dados das 6 cartas, componente de renderização e página de "minha carta de builder" pro aluno.

## O que será criado

### A. Asset & memória de design

- `src/assets/joao-de-barro-tutor.png` já substituído pela tua imagem (avatar do tutor já correto agora).
- `.lovable/refs/mascote-estetica-base.png` salva como referência canônica.
- `mem://design/mascote-estetica.md` com prompt-base + tabela arquétipo→animal→prop + regras anti-regressão.
- `mem://index.md` atualizado.

### B. 6 mascotes novos (nano-banana pro + referência)

Tabela de geração:

| arquétipo      | animal        | prop principal           | accent color |
|----------------|---------------|--------------------------|--------------|
| visionário     | gavião        | luneta + horizonte       | azul         |
| artesão        | aranha        | teia + agulha            | rosa         |
| experimentador | macaco-prego  | tubo de ensaio           | laranja      |
| conector       | abelha        | mapa de pontos + colmeia | amarelo/laranja |
| pragmático     | tatu          | chave-inglesa            | vermelho     |
| narrador       | bem-te-vi     | livro + balão de fala    | azul         |

Cada um salvo em `src/assets/arquetipos/{slug}.png` (1024x1024).

### C. Schema do banco

Tabela `archetypes` (read público, write só admin):
- `slug` (PK textual: visionario, artesao, experimentador, conector, pragmatico, narrador)
- `name`, `animal`, `tagline`
- `superpower` (texto)
- `shadow` (texto)
- `next_move` (texto)
- `image_path` (referência ao asset)
- `accent_color` (token Perestroika)
- `display_order`

Coluna nova em `profiles`:
- `archetype_slug` (FK opcional pra `archetypes.slug`)
- `archetype_assigned_at` (timestamp)

Seed inicial com as 6 cartas (textos curtos no tom frattz, 60-100 palavras cada).

### D. Componentes & páginas

- `src/components/arquetipo/ArchetypeCard.tsx`: carta editorial reutilizando o idioma visual do `TarotCard` atual mas com layout próprio (mascote topo + nome + animal + 3 blocos: superpoder, sombra, próximo movimento).
- `src/features/arquetipo/useMyArchetype.ts`: hook que lê a carta do aluno logado.
- `src/features/admin/AdminArchetypes.tsx`: tela admin pra editar textos e atribuir arquétipo manualmente (seed via UI).
- `src/pages/MeuArquetipo.tsx` em `/app/arquetipo`: a carta do aluno em destaque, com download como PNG (reusa `useCardDownload`).
- Link na MobileNav e no dashboard quando o aluno tem arquétipo atribuído. Quando não tem ainda, mostra estado "tua carta abre no diagnóstico inicial" (o diagnóstico em si é o passo 5, fora desse plano).

### E. Refinos

- Memória `mem://design/mascote-estetica.md` populada com prompt-base e regras.
- Atualizar `BotAvatar` pra carregar bem o joão-de-barro novo (o asset já é PNG quadrado, só conferir crop/overflow no anel circular).

## Como vai parecer (esquema)

```
┌─────────────────────────────────────────┐
│  TUA CARTA DE BUILDER                   │
│                                         │
│        [mascote 280x280 centrado]       │
│                                         │
│              GAVIÃO                     │
│            visionário                   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  SUPERPODER                             │
│  vê o mapa antes do terreno...          │
│                                         │
│  SOMBRA                                 │
│  às vezes esquece que a galera...       │
│                                         │
│  PRÓXIMO MOVIMENTO                      │
│  essa semana, prototipa o menor...      │
│                                         │
│         [baixar carta] [voltar]         │
└─────────────────────────────────────────┘
```

## Ordem de execução

1. Salvar memórias e referência canônica.
2. Gerar 6 mascotes em sequência (nano-banana pro com imagem-referência), QA visual após cada um. Se algum sair fora do padrão, regenero.
3. Migration: tabela `archetypes` + coluna em `profiles` + RLS + seed das 6 cartas.
4. Componentes: `ArchetypeCard`, hook, página `MeuArquetipo`.
5. Admin: tela de edição + atribuição.
6. Integração: link no dashboard/nav + estado "aguardando diagnóstico".
7. QA navegando logado nos viewports mobile e desktop.

## Detalhes técnicos

- Geração via skill `imagegen` com `model: google/gemini-3-pro-image-preview`, passando o joão-de-barro como `image_url` de referência junto ao prompt textual.
- RLS na tabela `archetypes`: `select` público (todo mundo logado pode ler as 6 cartas), `insert/update/delete` só pra `has_role(auth.uid(), 'admin')`.
- Profile RLS: aluno só atualiza próprio archetype_slug se a UI explicitamente permitir (no MVP, só admin atribui via tela admin).
- Componente `ArchetypeCard` aceita `variant: "compact" | "full"` pra reuso em listagens vs página dedicada.
- Estado "sem arquétipo" no dashboard: card discreto com copy "tua carta de builder abre no diagnóstico inicial. logo logo." (placeholder até o passo 5).
- Download PNG: html2canvas no card em `variant="full"`, mesma técnica do `useCardDownload` já existente.

## O que NÃO entra nesse passo

- O **diagnóstico/quiz** que classifica o aluno em um dos 6 arquétipos. Isso vira o passo 5 (próximo).
- A página `/aula/:n` com estrutura das aulas. Vira passo 6.
- Geração via IA das cartas personalizadas por aluno (fica como evolução depois do MVP da eletiva).

## Riscos & mitigação

- **Estilo dos 6 mascotes inconsistente**: passar a imagem-referência a cada chamada e fazer QA visual logo após cada geração. Se o 1º sair fora, ajusto o prompt antes de gerar os outros 5.
- **Custo do gemini-3-pro-image**: 6 imagens em pro tem custo. Se preferir, posso fazer 1 piloto e validar antes de pagar pelos outros 5 (você escolheu "gerar todos"; sigo, mas aviso).
- **Migrations**: nada destrutivo, só `CREATE TABLE` e `ALTER TABLE ADD COLUMN nullable`. Reversível.
