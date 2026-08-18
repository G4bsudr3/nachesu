# texto das pílulas mal formatado

## o que está acontecendo

o texto do "momento 03 · aprofundamento" (e de todos os blocos de texto da pílula editorial) passa por um renderizador caseiro que só entende três coisas: parágrafo, `**negrito**` e lista com `- `.

tudo o mais aparece cru na tela, exatamente como no print:

- link vira texto: `[juterenzi doces](https://juterenzidoces.lovable.app/)` aparece com colchete e parêntese, e o estudante não consegue clicar
- itálico vira asterisco: `*minimum lovable product*` aparece com os asteriscos
- subtítulo não tem hierarquia própria: "o que é", "o que ele gera" ficam com o mesmo peso de um negrito qualquer no meio do parágrafo
- não existe separador, citação nem numeração

## o que eu vou fazer

1. **um renderizador de texto único pra todas as pílulas**, com markdown de verdade (a mesma base já usada no feedback do educador e no tutor). passa a entender link, itálico, subtítulo, lista numerada, citação e código inline. nada de conteúdo muda, só a forma como ele é desenhado.

2. **estilo editorial NachesU, não markdown genérico**
   - subtítulo (`o que é`, `curiosidade de casa`): League Gothic caixa alta, menor que o título da pílula, com respiro em cima, criando escada visual clara dentro do bloco
   - link: sublinhado discreto, cor de destaque da trilha, abre em nova aba, com ícone de link externo
   - itálico e negrito com o contraste certo no bege
   - listas com espaçamento maior entre itens, mais legível no celular
   - citação com barra lateral na cor da trilha

3. **aplicar em todos os lugares onde hoje o texto sai cru**, não só nessa pílula: os blocos de texto das outras pílulas que usam o mesmo caminho passam a usar o renderizador novo.

4. **conferir no navegador** o módulo 5 da IA na prática e mais um módulo da economia circular, no desktop e no mobile, pra garantir que nada quebrou de espaçamento.

## detalhe técnico

- criar `src/components/eletiva/PillMarkdown.tsx` sobre `react-markdown` + `remark-gfm` (ambos já instalados), recebendo `accent` pra colorir link e citação.
- substituir a função `RichText`/`renderInline` de `src/components/eletiva/pills/PillEditorial.tsx` por esse componente, e trocar os demais usos de texto cru encontrados nas pílulas.
- links externos com `target="_blank"` + `rel="noopener noreferrer"`; imagens continuam bloqueadas, como já é no markdown de feedback.
- nenhuma mudança de banco, nenhuma pílula editada, nenhum conteúdo reescrito.
