# medição do acesso e o que corrigir depois dela

## o que a medição mostrou

Rodei as consultas antes de escrever este plano. Resultado:

- **a correção do tempo real já está em produção.** O bundle publicado hoje é `index-B_iHhVyB.js` e contém o nome de canal com sufixo aleatório (`student-feedback-${id}-${random}`). O travamento da página do módulo está resolvido no ar.
- **quase todo mundo que entra, entra de verdade.** Nos últimos 14 dias, de todos os logins registrados, só **2 pessoas** entraram e o app nunca chegou a registrar acesso: `bernardo11536@edu.sebrae.com.br` e `andre11529@edu.sebrae.com.br`. Hoje, dos 6 logins, 5 renderizaram normal (inclusive a Julia, com 2 acessos hoje).
- **Bernardo:** conta ativa desde 29/05, matriculado em economia circular, login de hoje às 09:03 de Brasília, e **zero** dia de acesso, zero pílula, zero módulo, zero entrega. O login funciona; o app nunca abriu pra ele.
- **o registro de acesso só existe desde 03/08**, então o número grande de "logou e nunca renderizou" no acumulado é ruído histórico, não falha. Filtrando por logins de 03/08 pra cá: 42 pessoas logaram, 2 sem render.
- **10 pessoas matriculadas nunca logaram nenhuma vez.**

Conclusão: não é falha em massa. É um buraco de observabilidade (a gente só descobriu o Bernardo porque você perguntou) mais dois casos individuais.

## o que corrigir

### 1. registrar erro de cliente no banco
Hoje, quando a tela quebra pro estudante, o erro morre no console dele e ninguém fica sabendo. Criar tabela `client_error_log` (usuário, rota, mensagem, stack curto, user agent, data) e gravar a partir do `RootErrorBoundary`. RLS: estudante só insere a própria linha, admin lê tudo. Sem PII além do que já temos.

### 2. registrar o acesso mais cedo
O ping de acesso hoje depende de a tela `/app` renderizar. Se a tela quebra antes, some o rastro. Subir o ping pro ponto em que a sessão é confirmada no `AuthContext`, antes de qualquer tela pesada, pra que "entrou" e "conseguiu usar" virem dois sinais separados.

### 3. tornar o buraco visível no admin
No painel de acompanhamento, marcar quem tem login recente e nenhum acesso registrado, com um rótulo próprio ("entrou mas o app não abriu"). Hoje essa pessoa aparece igual a quem simplesmente não entrou.

### 4. os dois casos abertos
Bernardo e André: reenviar link de acesso e confirmar pelo registro se o app abre. Com o item 1 no ar, se quebrar de novo a gente vê o erro exato em vez de adivinhar.

## detalhe técnico

- nova tabela `public.client_error_log` com GRANT pra `authenticated` (insert) e `service_role`, RLS com insert `auth.uid() = user_id` e select via `has_role(auth.uid(),'admin')`
- `src/components/system/RootErrorBoundary.tsx`: gravação best-effort em try/catch, nunca pode quebrar o boundary
- `src/hooks/useAccessPing.ts` continua igual; muda só o ponto de chamada, pra `AuthContext` logo após a sessão hidratar
- `src/pages/Acompanhamento.tsx` e `supabase/functions/painel-escola/index.ts`: novo estado derivado comparando último login com último acesso registrado
