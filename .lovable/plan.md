# João-de-Barro vivo: 6 poses com voz própria

Hoje o mascote é uma única imagem (`joao-de-barro-tutor.png`) repetida em 18+ lugares. Vou transformá-lo num personagem com 6 poses distintas, cada uma com microcopy próprio, mapeadas semanticamente por contexto.

## As 6 poses

| # | slug | pose | onde aparece |
|---|------|------|--------------|
| 1 | `building` | construindo o ninho, com barro/galhinho no bico, casinha em obras atrás | loadings (App, Trilhas, Modulo, Dashboard, Certificado) |
| 2 | `thinking` | de cabeça inclinada, olho brilhando, bolha "..." discreta acima | TutorChat — estado "pensando..." |
| 3 | `talking` | bico aberto, asa em gesto, postura comunicativa | TutorChat — avatar das mensagens do tutor |
| 4 | `celebrating` | asas abertas, confete leve em paleta Perestroika, casinha pronta atrás | NextActionHero, Certificado (após emitir), FeedbackFinal (sucesso) |
| 5 | `resting` | sentado calmo no galho, casinha vazia ao lado, atmosfera de espera | empty states (MinhaCarta sem carta, Pending, FutureLetter "ainda não") |
| 6 | `peeking` | espiando do canto, só meio corpo, olhar curioso | decoração de fundo / canto (Pending hero, EletivaCard, Auth, ResetPassword, PublicForm canto) |

Mantém 100% a referência canônica (`mem://design/mascote-estetica.md`): paleta Perestroika, contorno preto fino, fundo bege, sem 3D.

## Microcopy por pose

Cada loading/empty ganha frase com voz do mascote (lowercase, sem em-dash, "você"):

- `building` loading: "construindo seu ninho..." / "ajeitando os galhinhos..." / "preparando o barro..." (rotativo aleatório por mount)
- `thinking` no chat: substitui "pensando..." por "amassando o barro da resposta..."
- `resting` MinhaCarta vazia: "ainda sem galhos por aqui. envia o fbi que eu começo a construir."
- `resting` FutureLetter agendada: "sua carta tá no ninho, esperando o tempo certo."
- `celebrating` Certificado: "ninho pronto. parabéns por construir."
- `peeking` decoração: sem texto (só presença visual)

## Geração dos assets

Usar `lovable_ai` skill com Nano Banana Pro (`google/gemini-3-pro-image-preview`) e `--edit-image` passando a referência canônica `joao-de-barro-tutor.png` como base, garantindo continuidade visual (mesmo desenho, mesma paleta, só pose/expressão muda).

Saída: `src/assets/joao/{slug}.png` (6 arquivos, 1024x1024).

QA obrigatório: gero, abro cada PNG, verifico paleta + traço + sem texto + sem 3D antes de prosseguir.

## Refator do componente

`EletivaSymbol.tsx` ganha prop `pose` (default `building` pra retrocompatibilidade — todos os loadings atuais já fazem sentido com essa pose):

```tsx
type Pose = "building" | "thinking" | "talking" | "celebrating" | "resting" | "peeking";

<EletivaSymbol pose="celebrating" size={180} />
```

Internamente: map `pose → asset import`. Sem breaking change nos call-sites existentes — eu atualizo cada um pro pose semântico correto na mesma passada.

Novo helper opcional `useJoaoLine(context)` retorna microcopy aleatório do array daquele contexto, pra loadings parecerem vivos.

## Mapeamento detalhado dos 18 call-sites

```text
App.tsx                       → building   (loading global)
AppDashboard loading          → building
Trilhas loading               → building
Modulo loading                → building
Certificado loading           → building
OnboardingDialog              → talking    (mascote apresenta)
Onboarding card de boas-vindas→ talking
TutorChat avatar (msg)        → talking
TutorChat "pensando..."       → thinking
NextActionHero                → celebrating (já é celebratório)
Certificado pós-emissão       → celebrating
FeedbackFinal sucesso         → celebrating
MinhaCarta empty              → resting
FutureLetter (agendada)       → resting
Pending (decoração canto)     → peeking
EletivaCard (canto -top -right)→ peeking
Auth (canto pulse)            → peeking
ResetPassword (canto pulse)   → peeking
PublicForm canto              → peeking
PublicForm hero (size 120)    → talking
Index hero (size 84/140)      → celebrating
```

## Detalhes técnicos

- 6 imports no `EletivaSymbol`, lookup por objeto literal — Vite faz tree-shake bem.
- `alt=""` permanece (decorativo). Onde houver microcopy visível, o texto carrega o significado.
- Sem mudança de schema, sem edge function, sem migration.
- Atualizo `mem://design/mascote-estetica.md` adicionando seção "Poses do tutor" no fim.

## Critérios de aceitação

1. 6 PNGs gerados, todos coerentes com a referência (mesmo personagem reconhecível).
2. `EletivaSymbol` aceita prop `pose`, default `building`, sem quebrar nenhum call-site.
3. 18 call-sites atualizados pro pose semântico correto.
4. TutorChat alterna `talking` (msg) e `thinking` (loading) corretamente.
5. Loadings de página rotacionam entre 3 frases de microcopy do `building`.
6. Empty states (`MinhaCarta`, `FutureLetter`) usam `resting` + frase própria.
7. Memory atualizada com mapeamento das poses.
