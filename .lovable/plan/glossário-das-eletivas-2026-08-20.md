# glossário das eletivas

Uma página só, buscável, com os termos que se repetem nas aulas das duas eletivas. Definição curta, em linguagem de estudante de 14 anos, com etiqueta dizendo de onde o termo vem (ia na prática, economia circular, ou os dois).

## o que o estudante vê

Rota nova: `/app/glossario`.

- header padrão (logo central, voltar à esquerda, usermenu à direita) e `EletivaFooter`.
- título editorial + linha curta: "as palavras que mais aparecem nas aulas, explicadas em uma frase."
- campo de busca no topo, filtra por termo e por definição enquanto digita.
- 3 filtros por etiqueta: todas / ia na prática / economia circular.
- lista agrupada por letra inicial, cada item com o termo em display, a definição em 1-2 frases e a etiqueta de eletiva na cor da eletiva (laranja/rosa pra ia, lilás pra economia circular).
- empty state da busca convida: "não achei esse termo. pergunta pro tutor IA" com link pro tutor.
- mobile-first: item ocupa a largura toda, alvo de toque de 44px nos filtros.

## por onde se chega

- card de atalho novo em `/app/eletiva/:slug`, ao lado de tutor IA e materiais.
- link no rodapé do módulo, discreto, junto da navegação de próximo/anterior.

## conteúdo

Lista fixa no código, montada a partir da leitura das 232 pílulas das duas eletivas. Termos previstos (ajustáveis na hora de escrever):

- ia na prática: prompt, contexto, alucinação, MVP, MLP, MVT, iteração, protótipo, briefing, proposta de valor, canvas, pitch, usuário, dor, escopo, deploy, feedback loop.
- economia circular: economia linear, economia circular, regenerativo, sistema, stakeholder, fluxo de material, os 6 R's, ciclo biológico/técnico, externalidade, impacto, experimento de baixo custo, hipótese, evidência, dossiê.
- comuns às duas: PBL, pílula, trilha, entrega/registro, validação, protótipo.

Cada definição em até 2 frases, lowercase, "você", zero travessão, zero emoji.

## detalhes técnicos

- `src/data/glossario.ts`: array tipado `{ termo, definicao, tags: ("ia" | "circular")[], sinonimos?: string[] }`, ordenado alfabeticamente por normalização sem acento.
- `src/pages/Glossario.tsx`: página, busca client-side com `useMemo` (normaliza acento e caixa, casa termo + sinônimos + definição), estado da busca e do filtro na URL via o hook `useUrlState` já existente, pra o link ser compartilhável.
- rota lazy em `src/App.tsx` dentro de `ProtectedRoute` (junto das outras rotas `/app`), mais entrada no SEO se aplicável a rota logada.
- atalho novo em `src/pages/EletivaHome.tsx` na seção de atalhos (grid vira 3 colunas em `sm`) e link em `src/components/eletiva/modulo/ModuloFooter.tsx`.
- teste unitário do filtro de busca (acento, caixa, sinônimo) em `src/data/__tests__/glossario.test.ts`.
- sem banco, sem tabela nova.
