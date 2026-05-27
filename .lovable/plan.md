## o que já existe (não precisa mexer)

A persistência de progresso por pílula **já está implementada** e funciona pras duas eletivas:

- Tabela `student_pill_progress` guarda `{user_id, pill_id, completed_at}` com unique `(user_id, pill_id)`.
- `useEletivaProgress` lê esse registro e devolve `completedPillIds` (Set).
- `togglePillMutation` em `Modulo.tsx` faz upsert na tabela ao clicar "concluir pílula" (qualquer tipo: video_embed, quiz, editorial, pbl, checklist, etc).
- `unlockedPillIds` (memo em `Modulo.tsx`) calcula liberação sequencial: pílula N só abre quando todas as anteriores **obrigatórias** estão em `completedPillIds`. Pílulas opcionais (`required=false`) não bloqueiam.
- Estado sobrevive a refresh, troca de device e logout — vem do banco em toda hidratação.
- Auditado nos dois módulos 1:
  - `ia-na-pratica` mód 1: pílula 0 bônus (opcional) + 5 obrigatórias.
  - `economia-circular` mód 1: 4 obrigatórias + 1 bônus opcional no fim.

## o que ainda falta (foco dessa entrega)

1. **Feedback instantâneo ao desbloquear a próxima pílula.** Hoje, depois de concluir uma pílula, a próxima só revela quando o `invalidateQueries(["eletiva-progress"])` termina o refetch (300-800ms de "piscada"). Pra estudante ansioso parece que travou.
2. **Resiliência contra clique duplo / dessincronia.** Se o estudante clica "concluir" duas vezes rápido em pílulas diferentes antes do refetch, o `unlockedPillIds` calculado pode estar defasado e a segunda pode aparecer travada por meio segundo.
3. **Garantia visual de que a próxima abriu.** Nenhum micro-feedback dedicado ("pílula 03 liberada") quando o desbloqueio acontece. Existe `ModuloAutoCompleteBurst` só pro módulo inteiro.

## plano

### 1. atualização otimista no `togglePillMutation` (`src/pages/Modulo.tsx`)
- Antes do upsert, fazer `queryClient.setQueryData(["eletiva-progress", courseId], ...)` adicionando o `pill.id` ao `completedPillIds` localmente.
- Em `onError`, reverter (`setQueryData` de volta) e mostrar toast.
- Em `onSuccess`, manter o `invalidateQueries` como source of truth.
- Resultado: a próxima pílula desbloqueia no mesmo frame do clique, sem esperar o round-trip.

### 2. micro-celebração de pílula liberada (`ModuloPillList.tsx`)
- Quando uma pílula passa de `locked → unlocked` (detectar via `useEffect` comparando set anterior vs atual), aplicar um pulso curto (Framer Motion, 600ms, fade+rise) no card recém-aberto e um sublabel temporário "agora é a sua vez" abaixo do título por 4s.
- Respeitar `prefers-reduced-motion`.

### 3. blindagem do botão "concluir pílula"
- Em `PillVideoEmbed`, `PillQuiz`, `PillEditorial`, `PillPBLEstruturado`, `PillChecklistPacto`, `PillRadar`, `PillConteudoCurado`, `PillBonus`: enquanto `isCompleting` (togglePending) estiver true, manter o botão desabilitado (já está) **e** adicionar `aria-busy="true"` + label "salvando..." pra deixar claro que tá persistindo.
- Auditar se algum desses ainda permite clicar duas vezes (chamando `onComplete` sem checar `isCompleted`). Já vi `PillQuiz` faz `disabled={!ready || isCompleted || isCompleting}` — ok. Padronizar nos demais.

### 4. verificação cruzada nas duas eletivas
- Smoke test manual (descrito no follow-up): logar como estudante, fazer mód 1 de `ia-na-pratica` (incluindo pular o bônus opcional pra confirmar que pílula 1 abre direto) e mód 1 de `economia-circular` (verificar que o quiz e o radar_form persistem e abrem o próximo). Refresh no meio de cada etapa pra confirmar persistência real do banco.

### arquivos a editar
- `src/pages/Modulo.tsx` (otimista no `togglePillMutation` com rollback).
- `src/components/eletiva/modulo/ModuloPillList.tsx` (detector de transição locked→unlocked + animação por card).
- `src/components/eletiva/pills/PillVideoEmbed.tsx` e `PillEditorial.tsx` (padronizar `aria-busy` e label "salvando...").
- (Opcional) `PillPBLEstruturado.tsx`, `PillChecklistPacto.tsx`, `PillConteudoCurado.tsx`, `PillRadar.tsx`, `PillBonus.tsx` se a auditoria mostrar inconsistência.

### fora de escopo
- Não mexer no schema do banco (já tá certo).
- Não tocar em `useEletivaProgress` nem na lógica de `unlockedPillIds` (contratos já corretos).
- Não mudar `ModuloFooter` (a trava de "concluir módulo" já foi feita na entrega anterior).
