## diagnóstico

`student_engagement_risk` calcula `last_activity_at = GREATEST(MAX(started_at), MAX(completed_at), enrolled_at)`. Matriculados que nunca abriram nada herdam `enrolled_at` e, se a matrícula é antiga, viram `lost` automaticamente. Os 2 "críticos" no banner são você mesmo (mateusfrattezi, matriculado em 4-mai nos 2 cursos, zero progresso). Vários "medium" são alunos que ainda nem entraram (TiagoXXX, BernardoXXX, HeitorXXX, prog=0).

## o que muda

### 1. migração: flag de teste + view que ignora "nunca começou"

- adiciona `profiles.is_test boolean not null default false`
- recria `student_engagement_risk` excluindo:
  - perfis com `is_test = true`
  - matrículas sem nenhum `student_module_progress.started_at` AND sem nenhum `module_deliverables` com conteúdo (= nunca tocou nada)
- expõe view nova `student_activation_pending` listando matriculados ativos não-teste que ainda não começaram, com `days_since_enroll`. serve pra cards informativos, nunca alerta de risco.
- grants pra `authenticated` (admin lê via has_role nas tabelas-base, view fica security_invoker).

### 2. backend: hook + edge function

- `useAdminMetrics`: adiciona `nunca_comecaram` por curso (contagem da `student_activation_pending`) e remove esses ids dos buckets de risco. `em_risco` e `em_risco_critico` passam a representar apenas quem começou e parou. resto é automático porque a view já filtra.
- `check-student-evasion` (edge function): nenhuma mudança de código necessária; ao consumir a view filtrada deixa de cutucar quem nunca entrou.

### 3. ui admin

- `AdminHome`:
  - banner vermelho topo só renderiza quando `em_risco_critico > 0` (e agora isso significa "começou e sumiu 21+ dias", de verdade)
  - card "hoje" ganha uma terceira linha neutra: `X matriculados ainda não começaram` (sem cor de alerta, copy convidando ativação), clicando vai pra `/admin/risco?tab=ativacao`
- `AdminRisco`:
  - duas abas: `evasão` (atual, agora limpa) e `ativação pendente` (lista da nova view, com botão "convidar de novo" reaproveitando email de boas-vindas)
  - toggle no rodapé: "incluir contas de teste" (off por padrão; só pra QA local)
- `AdminUsers` (lista de usuários):
  - coluna nova com toggle `is_test`, escrita direta na tabela `profiles` (admin via has_role)
  - filtro "ocultar contas de teste" ligado por padrão

### 4. seed inicial e fonte de verdade

- migração marca `is_test = true` pra `mateusfrattezi`, `frattz`, `Mateus Frattz`, `duduobregon` (4 ids já identificados na auditoria) pra zerar o banner imediatamente
- atualiza `.lovable/plan.md` com a nova definição de risco

## arquivos tocados

```
supabase/migrations/<nova>.sql              novo
src/hooks/useAdminMetrics.ts                add nunca_comecaram
src/pages/AdminHome.tsx                     banner condicional + card neutro
src/pages/AdminRisco.tsx                    abas + toggle teste
src/pages/AdminUsers.tsx                    coluna is_test (se já existir lista; senão, atalho mínimo)
.lovable/plan.md                            registrar nova regra
```

## o que não muda

- copy do banner em si (continua "21+ dias sem aparecer") só passa a aparecer quando faz sentido
- definição de `caught_up` / thresholds de medium/high/lost (7/14/21) seguem iguais
- nenhuma alteração em rotas públicas ou jornada do estudante
