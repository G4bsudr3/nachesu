# abrir o próximo módulo já no topo

## o que está acontecendo

o app não reseta a rolagem quando muda de página. o botão "próximo módulo" fica lá embaixo, no fim do módulo, então quando a pessoa clica ela troca de módulo mas o navegador mantém a mesma altura de rolagem: ela cai no meio do módulo novo, com o começo já passado.

isso vale pra qualquer navegação do app, não só entre módulos: sair de uma página rolada pra outra sempre mantém a altura antiga.

## o que eu vou fazer

1. **toda troca de página começa no topo.** um controle único, aplicado no app inteiro, leva a rolagem pro topo assim que a rota muda. sem animação, instantâneo, pra parecer uma página nova de verdade e não um pulo.

2. **preservar as duas exceções que já funcionam hoje:**
   - link com âncora (o e-mail de "entrega revisada" abre direto no feedback do educador): continua indo pro ponto certo, sem competir com o topo
   - botão "continuar de onde parei" dentro do módulo: continua levando pro bloco onde a pessoa estava

3. **conferir no navegador**: entrar no módulo 4 da IA na prática, rolar até o fim, clicar em "próximo módulo" e confirmar que o módulo 5 abre no cabeçalho. repetir com o botão "módulo anterior" e com um link de âncora, no desktop e no mobile.

## detalhe técnico

- adicionar um componente `ScrollToTop` dentro do `BrowserRouter` em `src/App.tsx`, ouvindo `useLocation()`: em mudança de `pathname` sem `hash`, `window.scrollTo({ top: 0, behavior: "instant" })` num `useLayoutEffect` (antes da pintura, pra não piscar).
- quando existe `hash`, não faz nada: o efeito de âncora que já vive em `src/pages/Modulo.tsx` continua responsável pelo scroll.
- nenhuma mudança de banco, de conteúdo ou de layout.
