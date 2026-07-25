## situação atual (verificado)

- Módulo 3 de "economia-circular" já existe no banco (`02fe9a42-…`), mas o conteúdo atual é sobre "input e output / cafezinho" — nada a ver com o briefing novo (Iceberg + Mapa de Atores). Vai ser reescrita completa das 5 pílulas.
- Componente `PillMapaAtores` não existe ainda.
- "Problema escolhido" mais confiável no fluxo atual: os 3 itens do Radar da Aula 1 (`module_deliverables.content.items`) — a Aula 2 classifica esses mesmos itens, então eles são o "problema" que a Aula 3 precisa ancorar. Vou puxar dali.

## o que vou construir

### 1. reescrever conteúdo do módulo 3 (migration)

- Novo título: `o problema não é o lixo — é o sistema` · objetivo alinhado ao briefing.
- 5 pílulas reescritas via `INSERT ... ON CONFLICT (id) DO UPDATE` mantendo os IDs atuais pra preservar progresso:
  - **Pílula 1 — Abertura**: texto do briefing + placeholder de vídeo + transcrição integral.
  - **Pílula 2 — Curado**: 2 cards (Iceberg video + artigo Estácio) + 3 perguntas-guia (4 campos texto pro Iceberg / múltipla escolha com feedback / texto longo "quem ganha").
  - **Pílula 3 — PBL Mapa de Atores**: schema novo `mapa_atores_2x2` com 4 quadrantes, min 2 atores cada, quadrante "ganha" obrigatório, pull dos 3 radar items no topo.
  - **Pílula 4 — Checagem**: 3 perguntas (cenário Iceberg / múltipla escolha com várias corretas / texto longo sobre resistência).
  - **Pílula 5 — Bônus**: Story of Bottled Water + campo opcional Iceberg aplicado.

### 2. componente novo `<PillMapaAtores />`

- 4 cards editáveis em grid 2x2 (mobile: 1 coluna empilhada). Não uso drag-drop — o próprio briefing diz "drag-drop OU cards editáveis" e cards editáveis funciona muito melhor mobile-first.
- Cada quadrante: título + descrição + lista dinâmica de atores (nome + descrição de 1 frase, `add ator` / remove).
- Header ancoragem: bloco cor lilás/creme mostrando "seu problema escolhido" com os 3 itens do Radar (`useAula1RadarItems`, mesma lógica do classificador).
- Aviso amarelo `#F2BC57` sobre o quadrante "ganha".
- Validação dura: `ready = todos quadrantes com ≥2 atores E quadrante ganha com ≥1 ator (redundante, ganha faz parte dos 4) E cada ator tem nome+descrição preenchidos`.
- Copy de erro no rodapé: "faltam atores em X", "detalhe cada ator", "explique quem ganha".
- Persistência via `useAutoSaveField` no field `mapa_atores_aula3` — objeto `{ [quadrante]: Array<{nome, descricao}> }`.
- Wire no `ModuloPillList` como novo `schemaType === "mapa_atores_2x2"`.

### 3. celebração pós-conclusão `<ModuloConclusaoMapaAtores />`

- Aparece quando `courseSlug === "economia-circular" && moduleNumber === 3 && isCompleted`.
- Renderiza o mapa 2x2 preenchido em versão "bonita" (cores duduo por quadrante, tipografia Sora display), contador total de atores, referência ao problema escolhido.
- Botão **"baixar mapa (PNG)"** usando `html-to-image` (já disponível como dep leve, ou fallback nativo `canvas`) — se `html-to-image` não estiver instalado, uso `dom-to-image-more` via CDN dinâmico OU escrevo função pura com `canvas` desenhando o mapa. Direção final: usar `html-to-image` (adiciono a dep) porque é o mínimo de código pro melhor resultado.
- Sem PDF por enquanto — o briefing diz "PNG/PDF" mas com PNG o aluno já consegue anexar/imprimir; se pedirem PDF depois, adiciono.

### 4. painel admin `/admin/eletiva/economia-circular/modulo/3`

- Nova RPC `admin_module3_mapa_atores_stats` (mesmo pattern da aula 2, `SECURITY DEFINER`, `has_role admin`).
- Agrega: KPIs (matriculados, fecharam a 3, entregaram o mapa), média de atores por quadrante, top 20 atores mais citados por quadrante (agrupamento por normalização simples do nome — lowercase trim), amostra de justificativas do quadrante "ganha" (é o mais rico pedagogicamente).
- Nova página `AdminEletivaModulo3.tsx` renderizando isso (cards por quadrante, ranking de atores, lista de "quem ganha").
- Rota adicionada em `App.tsx`.

## fora do escopo desta rodada

- Persistir cada ator numa tabela nova `mapa_atores_aula3` (o briefing sugere isso). O padrão da eletiva é persistir tudo no JSON do `module_deliverables.content`, que já dá pra agregar por RPC. Criar tabela nova só quebraria o padrão sem ganho concreto — a agregação por JSON já responde tudo que o professor precisa.
- Drag-drop entre quadrantes.
- Export em PDF (fica pra rodada seguinte se pedirem).

## como valido

- Aluno: entro na aula 3 com um user que já tem radar preenchido, monto o mapa, tento concluir sem preencher o quadrante ganha (deve travar), preencho, concluo, screenshot da celebração + baixo o PNG.
- Admin: `/admin/eletiva/economia-circular/modulo/3`, screenshot dos KPIs + ranking + amostra.
