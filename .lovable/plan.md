## objetivo
travar acesso de cada estudante à sua única eletiva via `course_invites`, sem mexer em schema ou em código de app.

## listas validadas
- **economia-circular (dudu)**: 118 estudantes, planilha `Lista_eletiva_1º_SEMESTRE_-_Dudu.xlsx` → aba `Economia Circular`
- **ia-na-pratica (frattz)**: 147 estudantes, planilha `Lista_eletiva_1º_SEMESTRE_-_Frattz.xlsx` → aba `Inteligência Artificial`
- zero sobreposição entre as duas listas (verificado, 0 e-mails em comum)
- e-mails normalizados (lowercase + trim) já no formato `nome11xxx@edu.sebrae.com.br`
- a aba "Planilha1" (282 linhas) que existe nos dois arquivos é lista geral da escola → **ignorada**

## como o mecanismo já funciona (não precisa criar nada novo)
- `course_invites(course_id, email_normalized)` com unique constraint
- trigger `handle_new_user` cria profile no signup
- trigger `claim_course_invites_on_signup` lê o primeiro convite do e-mail, cria `enrollments` na eletiva certa e marca o convite como claimed
- trigger `enforce_single_active_enrollment` já impede 2ª matrícula ativa fora de admin
- ou seja: inserindo 1 convite por estudante em sua eletiva = acesso travado a só uma

## execução

### passo 1 — seed de convites (1 chamada `insert`)
inserir 265 linhas em `public.course_invites`:
- 147 com `course_id = c0a00000-0000-0000-0000-000000000002`? **não** → ia-na-pratica é `...001`
- 118 com `course_id = c0a00000-0000-0000-0000-000000000002` (economia-circular)
- 147 com `course_id = c0a00000-0000-0000-0000-000000000001` (ia-na-pratica)
- `email_normalized` lowercase
- `ON CONFLICT (course_id, email_normalized) DO NOTHING` pra ser idempotente

### passo 2 — backfill pros 4 usuários que já existem na base
rodar uma vez:
```sql
INSERT INTO enrollments (user_id, course_id)
SELECT au.id, ci.course_id
FROM auth.users au
JOIN course_invites ci ON ci.email_normalized = lower(au.email)
WHERE ci.claimed_at IS NULL
ON CONFLICT DO NOTHING;

UPDATE course_invites
SET claimed_at = now(), claimed_by = au.id
FROM auth.users au
WHERE course_invites.email_normalized = lower(au.email)
  AND course_invites.claimed_at IS NULL;
```

### passo 3 — verificação
- `SELECT course_id, count(*) FROM course_invites GROUP BY 1` → deve dar 118 e 147
- `SELECT count(*) FROM course_invites WHERE claimed_at IS NOT NULL` → confere quantos dos 4 já existentes foram reconciliados

## fora de escopo (não toco agora)
- envio de magic link em massa (admin faz manual ou via outro fluxo)
- mudança em RLS, schema, código frontend
- tabela `invited_participants` (legado Chŏra) fica intocada
- alunos com 2 e-mails ou e-mail diferente do que está na planilha (não há sinal disso nos dados)

## risco / pegadinha
- se o domínio Sebrae redirecionar e-mails (alias) e o aluno logar com endereço diferente do listado, o trigger não casa. nesse caso o admin precisa adicionar o convite manualmente. fora da automação atual.
- a planilha do dudu tem 1 nome em case misto (`Lucas Felipe Silva De Oliveira`); todos os e-mails já foram normalizados em lowercase no passo de leitura.

## pra liberar
preciso passar pra build mode pra rodar o `insert` em massa.