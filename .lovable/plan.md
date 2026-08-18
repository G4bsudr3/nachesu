# pulso de feedback: consertar a leitura e mostrar quem deu qual nota

## diagnóstico do que está no ar hoje

O pulso está desatualizado em relação ao que os estudantes respondem.

Existem duas perguntas diferentes gravadas na mesma tabela `module_ratings`:

- **IA na prática**: pergunta de ritmo, 3 opções. 1 = tranquilo demais, 2 = no ponto, 3 = pesado demais.
- **Economia circular**: card de 5 estrelas de satisfação (1 a 5).

O painel `/admin/pulso` trata tudo como se fosse satisfação de 1 a 5. Conferido no banco: as 10 avaliações existentes hoje são **todas da IA na prática**, no formato de ritmo, nenhuma com comentário. Por isso a leitura da IA na tela que você mandou está errada de ponta a ponta:

- "média geral 1.6 de 5" na verdade é ritmo médio 1.6, ou seja, a turma está achando **fácil demais**, não ruim
- "metade avaliou com a nota mínima 1" = metade achou tranquilo demais
- "nenhum estudante deu 4 ou 5" é impossível: a pergunta só tem 3 opções
- "módulo 2 com a menor nota possível 1.0" = o módulo 2 foi o mais fácil, não o pior

Ou seja, o admin está lendo elogio como reclamação. E não, hoje não dá pra ver quem deu qual nota no painel do pulso: só aparece nome quando tem comentário, e não tem nenhum. A informação existe no banco (cada linha tem estudante, módulo, nota e data), só não está exposta.

## o que eu vou fazer

### 1. separar as duas perguntas
Cada avaliação passa a ser lida pelo tipo de pergunta do curso: ritmo (3 opções) e satisfação (5 estrelas) nunca mais entram na mesma média.

- os cards do topo mostram os dois blocos separados, cada um com o rótulo certo
- no bloco de ritmo, em vez de "média 1.6", aparece a distribuição em palavra: quantos acharam tranquilo demais, no ponto, pesado demais, e qual o percentual "no ponto" (esse é o número que importa)
- ranking de módulos vira "módulos fora do ponto": os que mais concentram tranquilo demais ou pesado demais, com a direção explícita
- quando um curso ainda não tem resposta, o estado vazio diz isso, sem inventar média

### 2. leitura da IA reescrita
A análise passa a receber os dados já rotulados, com a escala de cada pergunta explicada, e é instruída a nunca somar as duas. Ela também recebe o tamanho da amostra e é orientada a não tirar conclusão de módulo com 1 ou 2 respostas.

### 3. quem deu qual nota, passado e futuro
Nova aba **por estudante** dentro do pulso, com o histórico completo, sem depender de comentário:

- tabela: estudante, eletiva, módulo, o que respondeu (em palavra, não número), quando respondeu, comentário se tiver
- busca por nome e filtros por eletiva, módulo e resposta
- clicar num estudante abre a linha do tempo dele: todas as avaliações que já deu, em ordem
- clicar num módulo mostra a lista nominal de quem respondeu o quê naquele módulo
- exportar CSV do que estiver filtrado
- as avaliações futuras entram automaticamente nessa mesma visão, sem trabalho extra

Vale dizer que a avaliação nunca foi anônima pro estudante: a resposta sempre foi gravada com o nome dele. A tela vai deixar isso visível pra você, e o microcopy da pergunta no módulo vai dizer com honestidade que a resposta é lida pelo educador.

### 4. juntar as duas telas
Hoje existe uma segunda leitura das mesmas avaliações escondida em `/admin/eletiva/:slug/avaliacoes`, fora do menu. Ela vira um atalho pro pulso já filtrado por aquela eletiva, pra não ter duas fontes de verdade.

## detalhe técnico

- `src/features/admin/usePulso.ts`: adicionar `scale` derivado do curso (`ritmo` 1-3 para ia-na-pratica, `satisfacao` 1-5 para os demais), particionar todos os agregados por escala, trocar `detractorsPct`/`promotersPct` por métricas próprias de cada escala e nunca misturar as duas em `stats.average`.
- `src/pages/AdminPulso.tsx`: cards por escala, ranking "fora do ponto", nova aba por estudante com busca/filtros/CSV e drill-down por estudante e por módulo.
- `supabase/functions/analyze-pulso/index.ts`: enviar os dados já rotulados e as duas escalas descritas no prompt, com guarda de amostra mínima; regravar o insight em `admin_insights` scope `pulso`.
- `src/pages/AdminAvaliacaoModulos.tsx`: passa a redirecionar pro pulso filtrado.
- nenhuma mudança de schema. `module_ratings` já guarda user_id, module_id, rating, comment e datas.
- verificação no navegador: abrir `/admin/pulso`, conferir que o bloco de ritmo mostra a distribuição correta das 10 respostas da IA, que economia circular aparece como sem respostas ainda, e que a aba por estudante lista as 10 com nome, módulo e resposta.
