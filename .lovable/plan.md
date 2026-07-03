# Módulo 5 (ia-na-pratica) — upgrade editorial

Mesmo padrão do módulo 4. UPDATE nas 5 pílulas existentes da trilha 1, módulo 5. IDs preservados, `kind` e `order_index` intactos. Zero mudança em publicação, releases ou progresso.

## Pílulas afetadas

| ord | kind | id (curto) | título novo | schema |
|---|---|---|---|---|
| 1 | pilula_a | c6328c5b | o que é o lovable (e por que ele existe) | `pilula_editorial` com vídeo |
| 2 | pilula_b | fd4457ed | o ciclo: prompt, preview, teste, refino | `pilula_editorial` com vídeo |
| 3 | pilula_c | a49a4ff2 | os superpoderes: cloud, ai e publicação | `pilula_editorial` com vídeo |
| 4 | exercicio_pbl | bb3f1e65 | sua primeira construção publicada | `pbl_estruturado` (4 campos + upload) |
| 5 | registro | cb76d98d | publiquei minha primeira coisa na internet | `checklist_pacto` |

## Ajustes por conta das suas observações

- Todo link que aponta pro lovable vai usar o **link de indicação** `https://lovable.dev/invite/3PLAIFF` (10 créditos extras pra quem cria conta). Aparece na pílula A ("acessa o lovable"), pílula C (menção rápida) e no passo 1 do exercício.
- Vou incluir um **case real** na pílula A logo depois do bloco "curiosidade de casa": a **juterenzi doces**, site feito por uma aluna da Escola Sebrae e publicado no lovable (`https://juterenzidoces.lovable.app/`). Serve como prova de que "não é hype, colega sua já fez". Fica como link clicável dentro do aprofundamento.

## Mapeamento do exercício PBL

O componente `PillPBLEstruturado` usa chaves fixas. Mapeio os campos do brief pras chaves existentes (sem precisar de extensão de código):

- `link_publicado` → `pedido_a` (text, label = "link público do seu projeto")
- `prompt_inicial` → `por_que` (textarea, label = "o prompt corf que você usou")
- `ajustes` → `aprendi` (textarea, label = "os 2 refinos que você pediu e o que mudou")
- `print` → `print_a` (evidence upload, label = "print da página aberta no seu celular")

Passo 2 usa link `https://lovable.dev/invite/3PLAIFF`. Duração 25-35 min.

## Conteúdo

Copio literal o brief. Cada `body_md` fica com resumo de 1-2 linhas no padrão dos módulos 1-4. Vídeos:

- Pílula A: youtube `zKLowGFQqTw`, instrução "primeiros 10 minutos"
- Pílula B: youtube `_aeeMNmcH6w`, instrução ciclo prompt→preview→teste→refino
- Pílula C: youtube `wXf3CRZbq8o`, canal "sem codar", foco em banco + login

Destaques dos ganchos: A=`meses`, B=`4`, C=`3`. Reflexões amarram com módulos 2, 4 e 9 conforme brief.

## Memórias que vou salvar em paralelo

Pra não precisar repetir esses combinados a cada módulo:

- **Link de indicação lovable**: sempre que citar/lincar o lovable no conteúdo, usar `https://lovable.dev/invite/3PLAIFF`.
- **Case juterenzi doces**: usar como exemplo real de aluna da Escola Sebrae que publicou site no lovable (`https://juterenzidoces.lovable.app/`).

## Como aplico

Um `supabase--insert` com 5 UPDATEs `WHERE id = '<uuid>'` setando `title`, `body_md`, `duration_min_low`, `duration_min_high` e `interaction_schema` (jsonb). Nenhum arquivo React tocado.

## Fora do escopo

- Módulos 6-10
- Módulo 5 da eletiva de economia circular
- Publicar ou liberar via `module_releases`
