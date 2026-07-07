# Inclusão dos 2 curtos Karnal vs. Claude na eletiva IA na Prática

## Contexto rápido

- Eletiva **IA na Prática** já tem módulos 1-10 publicados.
- Os dois vídeos escolhidos são curtos (4-7 min) e casam com temas de módulos que já existem.
- Estratégia: entrar como **pílula bônus opcional** (`required=false`) nos módulos já publicados. Não bloqueia progresso, não invalida quem já completou, não exige despublicar.

## Onde cada vídeo entra

**Vídeo 1 — "Devemos temer a I.A.?" (7:05)**
- Módulo alvo: **1 · IA sem hype: o que ela faz bem (e mal)**
- Trilha: Fundamentos & IA
- Razão: casa com a régua "nem hype nem pânico" que abre a eletiva.
- Posição: última pílula do módulo, após o registro (order_index = 6).
- Kind: `bonus` (ou `pilula_c` bônus, dependendo do enum aceito — a checar antes de aplicar).
- Duração: 7 min.
- `required=false`.

**Vídeo 2 — "I.A. pode contrariar seus criadores?" (4:25)**
- Módulo alvo: **3 · verificar antes de confiar: lidar com alucinação e viés**
- Trilha: Fundamentos & IA
- Razão: complementa o tema de limites/controle da IA. Karnal força a IA a se posicionar, o estudante vê na prática a fricção entre modelo e criador.
- Posição: última pílula do módulo (order_index = 6).
- Kind: `bonus`.
- Duração: 5 min.
- `required=false`.

## Estrutura de cada pílula bônus

Cada uma segue o formato de `PillVideoEmbed` (já existe no código, aceita YouTube):

- **Título** (short, lowercase, tom NachesU):
  - Módulo 1: "bônus: devemos temer a ia? (karnal vs. claude)"
  - Módulo 3: "bônus: e se a ia contrariar quem criou ela?"
- **body_md** (2-3 linhas de contexto + microcopy):
  - Curadoria: quem é Karnal, por que assistir, o que observar no vídeo (menos a resposta, mais *como* ele conversa com a IA).
- **interaction_schema** (JSON):
  - `type: "video_embed"`
  - `provider: "youtube"`
  - `embed_url`: URL do YouTube em formato embed
  - `reflexao`: 1 pergunta curta pra registrar depois (opcional, não bloqueia)
- **video_url**: mesma URL (fallback)
- **duration_min_low / high**: duração real do vídeo + 2 min de leitura
- **required**: `false`

## Perguntas de reflexão (opcional, curtinhas)

- Módulo 1: "de 0 a 10, quanto medo você tinha da ia antes do vídeo? e agora?"
- Módulo 3: "quando a ia te deu uma resposta que você achou estranha, o que você fez? (nada, aceitou, ou desconfiou?)"

## Passo a passo de implementação

1. Verificar valores válidos do enum `kind` em `module_pills` (pra saber se `bonus` existe ou se uso outro).
2. Confirmar que `PillVideoEmbed` suporta YouTube embed (já confirmado no código: `allow` cobre).
3. Confirmar URLs oficiais dos dois vídeos no canal do Karnal.
4. Rodar 2 `INSERT` em `module_pills` (um pra cada módulo), com `order_index=6`, `required=false`, `published=true`.
5. Testar visualmente:
   - Abrir módulo 1 como estudante, ver a pílula bônus no fim, iframe carrega.
   - Idem módulo 3.
6. Marcar como concluída em teste, confirmar que não atrapalha o cálculo de progresso do módulo.

## Riscos e mitigação

- **Enum `kind`**: se `bonus` não existir, uso `pilula_c` extra com `required=false` — muda pouca coisa visual.
- **Quality gates de publicação**: como estamos inserindo em módulo já publicado, o trigger `assert_module_quality` pode reclamar se algum campo obrigatório faltar. Mitigação: incluir `body_md` com conteúdo real (não vazio) e evitar as palavras bloqueadas (`prompt`, `tutor_prompt` no JSON — usar `reflexao` como já fizemos antes).
- **URL do YouTube pode mudar**: fallback é `video_url` + `attachment_url` com link direto.

## Detalhes técnicos

- Nenhuma alteração de código React necessária: `PillVideoEmbed` + `ModuloPillList` já renderizam pílulas com `interaction_schema.type = "video_embed"`.
- Nenhuma migration necessária, só inserts em `module_pills`.
- Zero mudança em `module_releases` (módulos já liberados).
- Se aparecer erro de `assert_module_in_scope`, aplicamos o mesmo padrão de `reflexao` (não `prompt`) no JSON.

## Fora do escopo deste plano

- Não vou mexer nos módulos 4-10 nem em Economia Circular.
- Não vou criar novo tipo de pílula nem novo componente React.
- Não vou editar as pílulas existentes desses módulos, só adicionar 1 nova em cada.
