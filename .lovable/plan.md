## diagnóstico

Investiguei DB + UI. A boa notícia: a estrutura técnica já suporta duas eletivas independentes (tabelas `courses`, `enrollments`, `trails`, `modules`, `module_pills`, `module_releases` com RLS por `user_id`). Matrícula em só uma é tecnicamente possível e o switcher/dashboard escopam por `course_id` via `useEletivaProgress(courseId)`. O conteúdo das pílulas de Econ. Circular no banco está limpo, fala de vazamentos, sistemas e externalidades — sem IA.

A bagunça é de **copy hardcoded e marketing público que vaza IA pra dentro do mundo de Econ. Circular**:

1. **`EletivaCard.tsx` linha 66** — o eyebrow do estado "aquecendo" (quando 0 módulos publicados) está hardcoded como `"eletiva ia na prática"`, então qualquer estudante de Econ. Circular sem módulos liberados vê "eletiva ia na prática" no hero do dashboard. Bug grave.
2. **`Eletivas.tsx` (landing pública `/eletivas`)** — descrição longa de Econ. Circular diz "20 semanas pra enxergar o sistema… **com ia te ajudando a iterar**" e a trilha 3 diz "prototipar negócios regenerativos, **com ia te ajudando a iterar rápido**". Vende IA como valor central de uma eletiva que não é sobre isso.
3. **Atalho "tutor IA"** no `EletivaHome` está OK conceitualmente (joão-de-barro é tutor IA pras duas), mas o copy "tira dúvida a qualquer hora" é genérico. Pode ganhar um sub-rótulo coerente com cada eletiva.
4. **Trilhas/módulos no DB** estão corretos — não precisa migration de conteúdo.
5. **Matrícula seletiva** já funciona no banco; nada precisa mudar em schema/RLS. Hoje os 2 usuários de teste estão nas duas, mas o sistema aceita matrícula em só uma — comportamento de switcher/dashboard quando há 1 matrícula está coberto em `AppDashboard.tsx`.

Pílulas de Econ. Circular ainda usam "tu" em vez de "você", o que viola a regra de tom do projeto. Fica como ponto separado (não bloqueia esse refactor) e pode entrar num passe posterior.

## o que fazer

### 1. `EletivaCard.tsx` — remover hardcode "ia na prática"
Ler o título do curso ativo via `useMyEnrollments` + `useActiveEletiva` (mesma lógica do `AppDashboard`) e renderizar o eyebrow dinâmico: `eletiva {course.title.toLowerCase()}`. Aplicar nos 3 estados (aquecendo, ciclo completo, em andamento) pra coerência. Se o card receber `snapshot` mas ninguém passar o nome do curso, aceitar uma prop opcional `courseTitle` pra evitar refetch extra — mas o caminho default lê via hook.

### 2. `Eletivas.tsx` (landing pública) — limpar narrativa de Econ. Circular
- Trilha 3 "criar": trocar `"prototipar negócios regenerativos, com ia te ajudando a iterar rápido."` por algo que fale de prototipação/ideação sem mencionar IA.
- `descLonga`: trocar `"20 semanas pra enxergar o sistema, mapear ciclos e prototipar negócios regenerativos com ia te ajudando a iterar."` por uma frase centrada em sistemas + regeneração + escola sebrae como laboratório.
- Tag `"4 trilhas · 20 módulos · tutor ia"` fica em IA na Prática. Em Econ. Circular vira `"4 trilhas · 20 módulos · pbl real"` ou equivalente que reflita a metodologia.

### 3. `EletivaHome.tsx` — atalhos por contexto
Sublabel do atalho "tutor IA" ganha texto contextual por slug:
- ia-na-pratica → `"tira dúvida de prompt, código, escopo."`
- economia-circular → `"discute hipótese, sistema, evidência."`
Mantém o nome "tutor IA" (joão-de-barro segue sendo o tutor das duas, conforme project knowledge).

### 4. Verificação de isolamento (sem código novo)
Documentar em `.lovable/plan.md` que:
- matrícula em uma eletiva só já funciona (RLS escopa por `user_id`, `useMyEnrollments` retorna só ativas, switcher só aparece com 2+).
- `useEletivaProgress(courseId)` é a fonte de verdade. Qualquer página nova de eletiva deve receber `courseId` explícito.

### 5. fora do escopo deste passe (declarar e seguir)
- Reescrever pílulas de Econ. Circ. de "tu" pra "você" → próximo passe, mais conteúdo do que estrutura.
- Migrar/separar tutor-trail-chat por eletiva (ex: prompt-base do tutor diferente pra Econ. Circ.) → vale o debate em separado.

## arquivos tocados

- `src/components/dashboard/EletivaCard.tsx` — eyebrow dinâmico, aceita `courseTitle` opcional, fallback via hooks
- `src/pages/Eletivas.tsx` — copy de Econ. Circular limpa de IA
- `src/pages/EletivaHome.tsx` — sublabel do atalho tutor por slug
- `.lovable/plan.md` — atualizar seção sobre isolamento entre eletivas

Sem migration. Sem mudança de schema. Sem mudança de conteúdo de pílulas neste passe.

## perguntas antes de implementar

1. "tag" da landing pública pra Econ. Circular: prefere **"pbl real"**, **"laboratório bh"**, **"4 trilhas · 20 módulos · sem ia decorativa"**, ou outra?
2. Sub-rótulo do atalho tutor em Econ. Circular: **"discute hipótese, sistema, evidência."**, **"provoca tua hipótese e tua evidência."**, ou outro?
3. Quer que eu já faça o passe de "tu → você" nas pílulas de Econ. Circular junto, ou prefere isolado depois?
