# varredura de erros de produção, 15 a 19/08

Levantamento só de leitura. Nada foi alterado, nenhuma migration rodada.

## antes da lista: o que realmente existe de log

- `client_error_log` (tabela do app, alimentada pelo error boundary): **1 registro no total**, desde que existe.
- Logs de plataforma (postgres, edge, auth) consultados agora só têm **os últimos ~4 minutos** de retenção neste projeto (auth_logs: 10 linhas; edge_logs: 260 linhas; postgres_logs: 7 linhas). Não há histórico de 4 dias para consultar.
- O monitoramento de erros de runtime do projeto retorna **nenhum erro** no snapshot atual.

Ou seja: não existe base histórica para uma contagem completa de 4 dias. O que segue é tudo o que é comprovável hoje, e o resto está marcado como sem dado.

## 1. tipos de erro registrados nos últimos 4 dias

| erro | onde | ocorrências | 1ª data | última data | usuários distintos |
|---|---|---|---|---|---|
| `useLocation is not defined` (scope `root`, rota `/auth`) | `client_error_log` | 1 | 18/08 12:39 UTC | 18/08 12:39 UTC | 0 (usuário deslogado, `user_id` nulo) |

Nenhum outro erro gravado nesse período em nenhuma fonte consultável.

## 2. autenticação/sessão, módulo, progresso, 401/403/RLS

- **Autenticação e sessão:** nos logs de auth disponíveis (janela de minutos), só eventos `status 200` e `303`, logins de `julia11556@` e `celeste11563@`, sem falha. O único erro gravado no app (`useLocation is not defined`) aconteceu na rota `/auth`.
- **Carregamento de módulo:** nenhum erro registrado.
- **Gravação de progresso:** nenhum erro registrado no período consultável. O que existe é o histórico já apurado antes: 9 ocorrências de `new row violates row-level security policy for table "student_module_progress"` entre 18 e 19/08, mais `permission denied for function get_my_profile` nos mesmos horários. Essas linhas vieram do monitoramento anterior e **não estão mais disponíveis para reconsulta**, então não dá para dar usuários distintos.
- **401/403 e RLS:** nos edge_logs da janela disponível, zero respostas >= 400 (243x 200, 8x 201, 4x 101, 3x 204, 2x 303). Sem amostra histórica de 4 dias.

Contexto de volume no mesmo período (não é erro, é base de comparação): acessos por dia 16/08 = 7, 17/08 = 35, 18/08 = 38, 19/08 = 9. Módulos iniciados: 16/08 = 8, 17/08 = 73, 18/08 = 69, 19/08 = 16.

## 3. erro que começou em 17/08 e não existia antes

**Não é possível afirmar.** Não há série histórica de erro por dia: a tabela do app tem 1 linha (18/08) e os logs de plataforma não guardam 17/08. O que mudou em 17/08 foi o volume de uso (7 → 35 acessos, 8 → 73 módulos iniciados), o que explica erros aparecerem "a partir" dessa data sem serem novos.

## 4. corrigido no código mas ainda não publicado

Os dois domínios servem o mesmo bundle: `assets/index-49G0AZOQ.js`. Verifiquei marcador por marcador dentro dele.

| item | está no ar? |
|---|---|
| Guard de sessão antes de gravar progresso (`ensureSession`, "sua sessão expirou...") em `src/pages/Modulo.tsx` | **NÃO publicado.** Corrigido no código, ausente no bundle. É exatamente a correção da violação de RLS em `student_module_progress`. |
| Normalização de alternativas (`choiceSchema`, `id`/`value`, `feedback_incorrect`, `min_length`) + alvo de toque de 52px em `PillConteudoCurado`/`PillQuiz` | **NÃO publicado.** Nenhum marcador (`touch-manipulation`, `feedback_incorrect`) no bundle. O bug do Pedro Caldeira na atividade 16 continua no ar. |
| Canal de realtime com sufixo aleatório (`student-feedback-...`) | publicado. |
| Gravação de erro de cliente no banco (`client_error_log` no error boundary) | publicado. |
| Tela de fallback do error boundary ("o joão tá pensando") | publicado. |

## observação sobre a cobertura de log

A tabela `client_error_log` só captura erro que derruba o React (error boundary). Falha de RLS, 401/403 e erro de rede que o app trata sozinho não entram lá, o que explica 1 linha em 4 dias com 38 acessos/dia. Não estou propondo mudança aqui, só registrando o limite da medição.
