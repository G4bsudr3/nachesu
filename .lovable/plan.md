## Contexto

Na página `/app/tutor` o estudante pode trocar de trilha pelo botão "trilha [nome da trilha]". Hoje não fica claro que essa troca muda o contexto das respostas do tutor IA. Vamos adicionar um microcopy indicativo ao lado do seletor.

## O que será feito

1. **Localizar o seletor de trilha** em `src/pages/TutorPage.tsx` (linhas ~387-424).
2. **Adicionar texto indicativo** logo acima ou ao lado do botão, explicando que a trilha selecionada contextualiza a dúvida.
   - Sugestão de copy: "escolha a trilha para contextualizar sua dúvida" ou "mude a trilha para direcionar a resposta do tutor".
   - Estilo: lowercase, fonte Urbanist, cor `text-perestroika-preto/55`, tamanho `text-[10px]` ou `text-xs`, alinhado com o botão.
3. **Manter a responsividade**: em telas pequenas o texto pode quebrar em duas linhas ou ficar acima do botão; em desktop pode ficar ao lado.
4. **Não alterar comportamento**: o Popover e a lógica de troca de trilha permanecem iguais.

## Critério de aceite

- O estudante vê, ao abrir o tutor, uma indicação clara de que pode trocar a trilha para mudar o contexto da pergunta.
- O texto respeita a paleta Perestroika/NachesU, tipografia Urbanist e diretriz de copy lowercase.
- Nenhuma regressão no layout mobile (sem sobreposição, sem quebra visual).

## Arquivos envolvidos

- `src/pages/TutorPage.tsx`