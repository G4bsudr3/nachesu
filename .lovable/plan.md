## Plano

Liberar o módulo 1 da eletiva **IA na Prática** (id `d89dc322-...`) inserindo uma linha em `module_releases`, igual à que já existe pra Economia Circular. Isso faz o RLS deixar o aluno enxergar o módulo no dashboard.

### Passo único
- `INSERT INTO public.module_releases (module_id, released_by) VALUES ('<id do módulo 1 de IA na Prática>', null)` via tool de insert do banco.
- Antes do insert, confirmar via `SELECT` o `id` exato do módulo 1 da trilha de IA na Prática (pra não chutar UUID).

### O que NÃO entra nesse plano
- Não mexer no bug do texto hardcoded `"eletiva ia na prática"` no `EletivaCard.tsx` (fica pra um próximo pedido, se quiser).
- Não mexer em schema, RLS ou código frontend.

### Resultado esperado
- Aluno matriculado em IA na Prática passa a ver o módulo 1 desbloqueado no dashboard, igual já acontece com Economia Circular.
