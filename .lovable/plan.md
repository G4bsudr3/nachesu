## Objetivo

Deixar a conta órfã `mateusfrattezi@gmail.com` (user_id `04bd3c2b-054b-45fb-8301-4f664c7724cf`) pronta como estudante de teste, com acesso simultâneo a **IA na Prática** e **Economia Circular**, sem mexer nas contas admin existentes.

## Estado atual

- Existe em `auth.users` desde 02/mai, sem `profile`, sem `user_roles`, sem `enrollments`.
- `handle_new_user` não rodou (conta provavelmente criada antes do trigger).
- Já tem regra `enforce_single_active_enrollment` que impede 2 matrículas ativas no mesmo usuário, então precisa de exceção.

## Passos (1 migration + 1 data change)

### 1. Migration: backfill seguro + exceção controlada

- Criar `profiles` pra esse user_id: `display_name = 'mateus frattezi'`, `nickname = 'mateusfrattezi'`, `status = 'active'`.
- Inserir role `participant` em `user_roles` (não admin, é conta de teste).
- Ajustar `enforce_single_active_enrollment` pra **pular a checagem** quando quem está inserindo é admin (`has_role(auth.uid(), 'admin')`). Justificativa: já faz sentido como guard-rail; admin que faz seed/teste pode quebrar a regra deliberadamente, estudante final não. Mantém a proteção pro fluxo de auto-matrícula.

### 2. Data change: matricular nas duas eletivas

- `INSERT` em `enrollments` pra os dois `course_id` (IA na Prática `c0a0…0001`, Economia Circular `c0a0…0002`) com `status = 'active'`.

## Como você testa depois

- Logout das contas admin, login em `mateusfrattezi@gmail.com` por magic link.
- `/app` deve mostrar o switcher das 2 eletivas + CTA pro próximo módulo publicado.
- Como hoje só os módulos com `published = true` aparecem, lembre de publicar pelo menos 1 módulo de cada eletiva pra ver pílula renderizando (já tem o toggle "Publicado/Rascunho" no admin).

## Reversão

Se quiser remover depois: deletar as 2 linhas em `enrollments`, deletar `user_roles`, deletar `profiles` desse user_id. Conta em `auth.users` continua intacta (você decide se apaga pelo painel).

## Fora de escopo

- Não vou apagar nem alterar `duduobregon` nem `hey@frattz.com`.
- Não vou reescrever `handle_new_user` (a conta órfã é caso histórico isolado).
- Não vou publicar módulos automaticamente — isso é decisão sua no admin.