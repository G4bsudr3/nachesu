# plano: remover o atalho ⌘K da sidebar admin

## objetivo
remover o elemento `<kbd>⌘K</kbd>` exibido ao lado do botão da command palette na sidebar admin.

## arquivo e mudança
- `src/components/admin/layout/AdminSidebar.tsx`, linha 94
- remover o elemento `<kbd>` e seu conteúdo, mantendo o botão de atalho funcional (a command palette continua abrindo com ⌘K via listener global).

## verificação
- `tsgo --noEmit` limpo.
- screenshot da sidebar admin confirmando que o ⌘K não aparece mais.

## escopo
- nenhuma outra página ou componente é alterado.
- o atalho de teclado continua funcionando; só remove o indicador visual.