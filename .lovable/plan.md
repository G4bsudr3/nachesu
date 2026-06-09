## o que tá pegando

Módulos publicados aparecem, mas a UI aplica regra "destrava só depois de completar o anterior" (sequential unlock no client). Resultado: mesmo admin enxerga só o módulo 1 como clicável, o resto fica "locked".

A trava mora 100% no client em `src/hooks/useEletivaProgress.ts`. RLS já libera o conteúdo, então é só pular a regra sequencial pros dois admins.

## plano

Editar **só** `src/hooks/useEletivaProgress.ts`:

1. Usar o `user.email` que já vem do `useAuth()`.
2. Criar um set local `ADMIN_BYPASS_EMAILS = { 'hey@frattz.com', 'duduobregon@gmail.com' }`.
3. No cálculo de `sequentialUnlock`, forçar `false` quando o email logado (lowercase/trim) estiver no set. Demais usuários seguem com a regra atual (default sequencial).
4. Mais nada: `publishedModules`, `currentModule`, contadores e pílulas seguem iguais. Os dois passam a ver todos os módulos publicados como `available`/`current` sem precisar concluir o anterior.

Sem migration, sem mexer em RLS, sem mexer em `TrilhaColumn`/`ModulePill`, sem mexer em `ALLOWED_EMAILS`. Bypass por email explícito (não por papel admin) pra não afetar outros admins futuros sem querer.

## fora de escopo

- não destravo pílulas/PBL individualmente (já abrem quando o módulo está unlocked)
- não mexo no progresso real (continua salvando se clicarem "concluir")
- não toco em flags nem em `useUserRole`
